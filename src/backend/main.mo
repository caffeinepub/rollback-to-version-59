import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  type TransactionType = {
    #cashIn;
    #cashOut;
    #upiIn;
    #upiOut;
    #savingsOut;
    #deductionsOut;
  };

  module TransactionType {
    public func toText(tt : TransactionType) : Text {
      switch (tt) {
        case (#cashIn) { "Cash In" };
        case (#cashOut) { "Cash Out" };
        case (#upiIn) { "UPI In" };
        case (#upiOut) { "UPI Out" };
        case (#savingsOut) { "Savings Out" };
        case (#deductionsOut) { "Deductions Out" };
      };
    };
  };

  type Transaction = {
    id : Nat;
    transactionType : TransactionType;
    amount : Nat;
    description : Text;
    date : Int;
  };

  module Transaction {
    public func compareByDate(t1 : Transaction, t2 : Transaction) : Order.Order {
      if (t1.date < t2.date) {
        #greater;
      } else if (t1.date > t2.date) {
        #less;
      } else {
        #equal;
      };
    };
  };

  type Balance = {
    cashIn : Nat;
    cashOut : Nat;
    upiIn : Nat;
    upiOut : Nat;
    cashBalance : Int;
    upiBalance : Int;
    savingsBalance : Int;
    deductionsBalance : Int;
    totalBalance : Int;
    excludedTotalBalance : Int;
  };

  type FilterDailyStats = {
    date : Int;
    cashIn : Nat;
    upiIn : Nat;
    totalTransaction : Nat;
    tenPercentDeduction : Nat;
    userAmountDeduction : Nat;
  };

  type DaywiseTransactionStats = {
    cashIn : Nat;
    cashOut : Nat;
    upiIn : Nat;
    upiOut : Nat;
    combinedTotal : Nat;
    totalBalanceForDay : Int;
    transactions : [Transaction];
  };

  type CumulativeStats = {
    cumulativeTenPercentSavings : Nat;
    cumulativeUserSpecifiedDeductions : Nat;
  };

  type DailyTracking = {
    totalDailyTransactions : Nat;
    dailyTenPercentDeduction : Nat;
    userSpecifiedDailyDeduction : Nat;
    totalDailyTransactionsWithDeduction : Int;
  };

  type OpeningBalance = {
    cashBalance : Nat;
    upiBalance : Nat;
    savings : Nat;
    userDeductions : Nat;
    date : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  type MonthlyTransactionSummary = {
    transactions : [Transaction];
    totalAmount : Nat;
    transactionCount : Nat;
  };

  let transactions = Map.empty<Nat, Transaction>();
  var nextTransactionId = 0;
  let userProfiles = Map.empty<Principal, UserProfile>();
  let accessControlState = AccessControl.initState();
  var adminPrincipal : ?Principal = null;
  var isAccessControlInitialized = false;
  let dailyTracking = Map.empty<Int, DailyTracking>();
  let userSpecifiedDeductions = Map.empty<Int, Nat>();
  let tenPercentSavings = Map.empty<Int, Nat>();
  let openingBalances = Map.empty<Nat, OpeningBalance>();
  var persistentOpeningBalance : OpeningBalance = {
    cashBalance = 0;
    upiBalance = 0;
    savings = 0;
    userDeductions = 0;
    date = 0;
  };

  private func ensureUserRegistered(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access this resource. Please authenticate with your PIN and Internet Identity.");
    };

    let currentRole = AccessControl.getUserRole(accessControlState, caller);

    if (currentRole == #guest) {
      if (not isAccessControlInitialized) {
        AccessControl.initialize(accessControlState, caller);
        isAccessControlInitialized := true;
        adminPrincipal := ?caller;
      } else {
        switch (adminPrincipal) {
          case (null) {
            Runtime.trap("System Error: Admin principal not found. Please contact support.");
          };
          case (?admin) {
            AccessControl.assignRole(accessControlState, admin, caller, #user);
          };
        };
      };
    };

    let newRole = AccessControl.getUserRole(accessControlState, caller);
    if (newRole == #guest) {
      Runtime.trap("Authorization Error: Unable to register user. Please try logging in again.");
    };
  };

  private func hasUserOrAdminPermission(caller : Principal) : Bool {
    let role = AccessControl.getUserRole(accessControlState, caller);
    role == #user or role == #admin;
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot initialize access control. Please authenticate first.");
    };

    AccessControl.initialize(accessControlState, caller);

    if (not isAccessControlInitialized) {
      isAccessControlInitialized := true;
      adminPrincipal := ?caller;
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot assign roles. Please log in with your PIN.");
    };

    ensureUserRegistered(caller);
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view profiles. Please ensure you are logged in with your PIN.");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: You can only view your own profile unless you are an admin. Please check your permissions.");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can save profiles. Please ensure you are logged in with your PIN.");
    };
    userProfiles.add(caller, profile);
  };

  // Opening Balance Functions
  public shared ({ caller }) func addOpeningBalance(
    cashBalance : Nat,
    upiBalance : Nat,
    savings : Nat,
    userDeductions : Nat,
    date : Int,
  ) : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can add opening balances.");
    };

    let newBalance : OpeningBalance = {
      cashBalance;
      upiBalance;
      savings;
      userDeductions;
      date;
    };

    openingBalances.add(date.toNat(), newBalance);
    persistentOpeningBalance := newBalance;
    "Success: Opening balances added. All financial calculations will now include these values.";
  };

  public query ({ caller }) func getOpeningBalance() : async OpeningBalance {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access opening balances. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view opening balances.");
    };

    persistentOpeningBalance;
  };

  public query ({ caller }) func getAllOpeningBalances() : async [OpeningBalance] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access opening balances. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view opening balances.");
    };

    openingBalances.values().toArray();
  };

  public shared ({ caller }) func updateOpeningBalance(
    cashBalance : Nat,
    upiBalance : Nat,
    savings : Nat,
    userDeductions : Nat,
    date : Int,
  ) : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can update opening balances.");
    };

    let updatedBalance : OpeningBalance = {
      cashBalance;
      upiBalance;
      savings;
      userDeductions;
      date;
    };
    persistentOpeningBalance := updatedBalance;
    "Success: Opening balances updated successfully.";
  };

  public shared ({ caller }) func addTransaction(
    transactionType : TransactionType,
    amount : Nat,
    description : ?Text,
    date : ?Int,
  ) : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can add transactions.");
    };

    if (amount == 0) {
      return "Failed to add transaction: Validation error - Amount must be greater than zero. Please enter a valid amount and try again.";
    };

    let transaction : Transaction = {
      id = nextTransactionId;
      transactionType;
      amount;
      description = switch (description) {
        case (null) { "" };
        case (?desc) { if (desc.size() == 0) { "" } else { desc } };
      };
      date = switch (date) {
        case (null) { Time.now() };
        case (?d) { d };
      };
    };

    transactions.add(nextTransactionId, transaction);
    nextTransactionId += 1;

    // Update balances for Savings (10%) Out and Deductions Out transactions
    switch (transactionType) {
      case (#savingsOut) {
        updateSavingsBalance(amount, true);
      };
      case (#deductionsOut) {
        updateDeductionsBalance(amount, true);
      };
      case (_) {};
    };

    "Success: Transaction added successfully";
  };

  public shared ({ caller }) func editTransaction(
    transactionId : Nat,
    transactionType : TransactionType,
    amount : Nat,
    description : ?Text,
    date : ?Int,
  ) : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can edit transactions.");
    };

    if (amount == 0) {
      return "Failed to edit transaction: Validation error - Amount must be greater than zero. Please enter a valid amount and try again.";
    };

    switch (transactions.get(transactionId)) {
      case (null) {
        return "Failed to edit transaction: Transaction with ID " # transactionId.toText() # " not found. Please ensure the ID is correct and try again.";
      };
      case (?existingTransaction) {
        let editedTransaction : Transaction = {
          existingTransaction with
          transactionType;
          amount;
          description = switch (description) {
            case (null) { "" };
            case (?desc) { if (desc.size() == 0) { "" } else { desc } };
          };
          date = switch (date) {
            case (null) { Time.now() };
            case (?d) { d };
          };
        };

        // Revert previous transaction impact on balances
        switch (existingTransaction.transactionType) {
          case (#savingsOut) {
            updateSavingsBalance(existingTransaction.amount, false);
          };
          case (#deductionsOut) {
            updateDeductionsBalance(existingTransaction.amount, false);
          };
          case (_) {};
        };

        // Apply new transaction impact on balances
        switch (transactionType) {
          case (#savingsOut) {
            updateSavingsBalance(amount, true);
          };
          case (#deductionsOut) {
            updateDeductionsBalance(amount, true);
          };
          case (_) {};
        };

        transactions.add(transactionId, editedTransaction);
        "Success: Transaction with ID " # transactionId.toText() # " edited successfully";
      };
    };
  };

  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access transactions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view transactions.");
    };

    transactions.values().toArray().sort(Transaction.compareByDate);
  };

  public query ({ caller }) func getTransactionsByType(transactionType : TransactionType) : async [Transaction] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access transactions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view transactions.");
    };

    transactions.values().toArray().filter(func(t) { t.transactionType == transactionType }).sort(Transaction.compareByDate);
  };

  public query ({ caller }) func getBalances() : async Balance {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access balances. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view balances.");
    };

    var cashIn = 0;
    var cashOut = 0;
    var upiIn = 0;
    var upiOut = 0;
    var savingsOut = 0;
    var deductionsOut = 0;

    for (transaction in transactions.values()) {
      switch (transaction.transactionType) {
        case (#cashIn) { cashIn += transaction.amount };
        case (#cashOut) { cashOut += transaction.amount };
        case (#upiIn) { upiIn += transaction.amount };
        case (#upiOut) { upiOut += transaction.amount };
        case (#savingsOut) { savingsOut += transaction.amount };
        case (#deductionsOut) { deductionsOut += transaction.amount };
      };
    };

    let cumulativeTenPercentSavings = tenPercentSavings.values().toArray().foldLeft(0, func(acc, val) { acc + val });
    let cumulativeUserSpecifiedDeductions = userSpecifiedDeductions.values().toArray().foldLeft(0, func(acc, val) { acc + val });

    let cashBalance = Int.fromNat(persistentOpeningBalance.cashBalance) +
      Int.fromNat(cashIn) -
      Int.fromNat(cashOut) -
      Int.fromNat(cumulativeTenPercentSavings) -
      Int.fromNat(cumulativeUserSpecifiedDeductions) -
      Int.fromNat(savingsOut);

    let upiBalance = Int.fromNat(persistentOpeningBalance.upiBalance) +
      Int.fromNat(upiIn) -
      Int.fromNat(upiOut);

    let savingsBalance = Int.fromNat(persistentOpeningBalance.savings) + Int.fromNat(cumulativeTenPercentSavings) - Int.fromNat(savingsOut);

    let deductionsBalance = Int.fromNat(persistentOpeningBalance.userDeductions) + Int.fromNat(cumulativeUserSpecifiedDeductions) - Int.fromNat(deductionsOut);

    let totalBalance = cashBalance + upiBalance + savingsBalance + deductionsBalance;
    let excludedTotalBalance = totalBalance;

    {
      cashIn;
      cashOut;
      upiIn;
      upiOut;
      cashBalance;
      upiBalance;
      savingsBalance;
      deductionsBalance;
      totalBalance;
      excludedTotalBalance;
    };
  };

  public query ({ caller }) func filterBalanceByDateRange(startDate : Int, endDate : Int) : async [FilterDailyStats] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot filter transactions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can filter transactions.");
    };

    let dateMap = Map.empty<Int, (Nat, Nat)>();

    for (transaction in transactions.values()) {
      if (transaction.date >= startDate and transaction.date <= endDate) {
        let (currentCashIn, currentUpiIn) = switch (dateMap.get(transaction.date)) {
          case (null) { (0, 0) };
          case (?(ci, ui)) { (ci, ui) };
        };

        let newCashIn = currentCashIn + (if (transaction.transactionType == #cashIn) { transaction.amount } else { 0 });
        let newUpiIn = currentUpiIn + (if (transaction.transactionType == #upiIn) { transaction.amount } else { 0 });

        dateMap.add(transaction.date, (newCashIn, newUpiIn));
      };
    };

    let results = dateMap.entries().toArray().map(
      func((date, (cashIn, upiIn))) {
        let totalTransaction = cashIn + upiIn;
        let tenPercentDeduction = calculateTenPercentDeduction(totalTransaction);
        let userAmountDeduction = getUserSpecifiedDeductionForDate(date);

        {
          date;
          cashIn;
          upiIn;
          totalTransaction;
          tenPercentDeduction;
          userAmountDeduction;
        };
      }
    );

    results.sort(func(a, b) { if (a.date > b.date) { #less } else if (a.date < b.date) { #greater } else { #equal } });
  };

  public query ({ caller }) func getDailyTracking(date : Int) : async DailyTracking {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access daily tracking. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view daily tracking.");
    };

    let filteredTransactions = transactions.values().toArray().filter(func(t) { t.date == date });

    let userSpecifiedDeduction = switch (userSpecifiedDeductions.get(date)) {
      case (null) { 0 };
      case (?deduction) { deduction };
    };

    calculateDailyTotals(filteredTransactions, userSpecifiedDeduction);
  };

  public shared ({ caller }) func setUserSpecifiedDeduction(date : Int, amount : Nat) : async () {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can set deductions.");
    };

    userSpecifiedDeductions.add(date, amount);
  };

  public query ({ caller }) func getUserSpecifiedDeduction(date : Int) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access deductions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view deductions.");
    };

    switch (userSpecifiedDeductions.get(date)) {
      case (null) { 0 };
      case (?deduction) { deduction };
    };
  };

  public query ({ caller }) func getCumulativeStats() : async CumulativeStats {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access cumulative stats. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view cumulative stats.");
    };

    let cumulativeTenPercentSavings = tenPercentSavings.values().toArray().foldLeft(0, func(acc, val) { acc + val });
    let cumulativeUserSpecifiedDeductions = userSpecifiedDeductions.values().toArray().foldLeft(0, func(acc, val) { acc + val });

    {
      cumulativeTenPercentSavings;
      cumulativeUserSpecifiedDeductions;
    };
  };

  public query ({ caller }) func getDaywiseTransactions(date : Int) : async DaywiseTransactionStats {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access day-wise transactions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view day-wise transactions.");
    };

    let filteredTransactions = transactions.values().toArray().filter(func(t) { t.date == date });

    var cashIn = 0;
    var cashOut = 0;
    var upiIn = 0;
    var upiOut = 0;

    for (transaction in filteredTransactions.values()) {
      switch (transaction.transactionType) {
        case (#cashIn) { cashIn += transaction.amount };
        case (#cashOut) { cashOut += transaction.amount };
        case (#upiIn) { upiIn += transaction.amount };
        case (#upiOut) { upiOut += transaction.amount };
        case (_) {};
      };
    };

    let combinedTotal = cashIn + upiIn;
    let totalBalanceForDay = Int.fromNat(combinedTotal) - Int.fromNat(cashOut + upiOut);

    {
      cashIn;
      cashOut;
      upiIn;
      upiOut;
      combinedTotal;
      totalBalanceForDay;
      transactions = filteredTransactions;
    };
  };

  public shared ({ caller }) func clearTransactionData() : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can clear transaction data.");
    };

    transactions.clear();
    dailyTracking.clear();
    userSpecifiedDeductions.clear();
    tenPercentSavings.clear();
    openingBalances.clear();

    persistentOpeningBalance := {
      cashBalance = 0;
      upiBalance = 0;
      savings = 0;
      userDeductions = 0;
      date = 0;
    };

    nextTransactionId := 0;
    "Success: All transaction data, including opening balances, cleared!";
  };

  public shared ({ caller }) func deleteTransaction(id : Nat) : async Text {
    ensureUserRegistered(caller);

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can delete transactions.");
    };

    switch (transactions.get(id)) {
      case (null) {
        "Failed to delete transaction: Transaction with ID " # id.toText() # " not found. Please ensure the ID is correct and try again.";
      };
      case (?transaction) {
        transactions.remove(id);
        // Reverse balance impact for Savings (10%) Out and Deductions Out transactions
        switch (transaction.transactionType) {
          case (#savingsOut) {
            updateSavingsBalance(transaction.amount, false);
          };
          case (#deductionsOut) {
            updateDeductionsBalance(transaction.amount, false);
          };
          case (_) {};
        };
        "Success: Transaction with ID " # id.toText() # " deleted successfully";
      };
    };
  };

  public query ({ caller }) func isAuthenticated() : async Bool {
    not caller.isAnonymous();
  };

  public query ({ caller }) func isAnonymous() : async Bool {
    caller.isAnonymous();
  };

  func calculateDailyTotals(transactions : [Transaction], userSpecifiedDeduction : Nat) : DailyTracking {
    let totalDailyTransactions = transactions.foldLeft(0, func(acc, txn) { acc + txn.amount });

    if (totalDailyTransactions > 0) {
      let tenPercent = (totalDailyTransactions * 10) / 100;
      let remainder = tenPercent % 10;
      let dailyTenPercentDeduction = if (remainder >= 5) {
        tenPercent + (10 - remainder);
      } else {
        tenPercent - remainder;
      };

      let totalDeductions = Int.fromNat(dailyTenPercentDeduction) + Int.fromNat(userSpecifiedDeduction);
      let totalDailyTransactionsWithDeduction = Int.fromNat(totalDailyTransactions) - totalDeductions;

      {
        totalDailyTransactions;
        dailyTenPercentDeduction;
        userSpecifiedDailyDeduction = userSpecifiedDeduction;
        totalDailyTransactionsWithDeduction;
      };
    } else {
      {
        totalDailyTransactions = 0;
        dailyTenPercentDeduction = 0;
        userSpecifiedDailyDeduction = userSpecifiedDeduction;
        totalDailyTransactionsWithDeduction = 0 - Int.fromNat(userSpecifiedDeduction);
      };
    };
  };

  func calculateTenPercentDeduction(totalAmount : Nat) : Nat {
    if (totalAmount > 0) {
      let tenPercent = (totalAmount * 10) / 100;
      let remainder = tenPercent % 10;
      if (remainder >= 5) {
        tenPercent + (10 - remainder);
      } else {
        tenPercent - remainder;
      };
    } else {
      0;
    };
  };

  func getUserSpecifiedDeductionForDate(date : Int) : Nat {
    switch (userSpecifiedDeductions.get(date)) {
      case (null) { 0 };
      case (?deduction) { deduction };
    };
  };

  func updateSavingsBalance(amount : Nat, isAddition : Bool) {
    if (isAddition) {
      persistentOpeningBalance := {
        persistentOpeningBalance with savings = if (persistentOpeningBalance.savings >= amount) {
          persistentOpeningBalance.savings - amount;
        } else {
          0;
        };
      };
    } else {
      persistentOpeningBalance := {
        persistentOpeningBalance with savings = persistentOpeningBalance.savings + amount;
      };
    };
  };

  func updateDeductionsBalance(amount : Nat, isAddition : Bool) {
    if (isAddition) {
      persistentOpeningBalance := {
        persistentOpeningBalance with userDeductions = if (persistentOpeningBalance.userDeductions >= amount) {
          persistentOpeningBalance.userDeductions - amount;
        } else {
          0;
        };
      };
    } else {
      persistentOpeningBalance := {
        persistentOpeningBalance with userDeductions = persistentOpeningBalance.userDeductions + amount;
      };
    };
  };

  // Monthly Transactions - New Functionality
  public query ({ caller }) func getMonthlyTransactions(year : Int, month : Int, transactionType : TransactionType) : async MonthlyTransactionSummary {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous users cannot access monthly transactions. Please authenticate first.");
    };

    if (not hasUserOrAdminPermission(caller)) {
      Runtime.trap("Unauthorized: Only registered users can view monthly transactions.");
    };

    var totalAmount = 0;
    let filteredTransactions = transactions.values().toArray().filter(
      func(t) {
        t.transactionType == transactionType and isInMonth(t.date, year, month)
      }
    );

    for (transaction in filteredTransactions.values()) {
      totalAmount += transaction.amount;
    };

    {
      transactions = filteredTransactions;
      totalAmount;
      transactionCount = filteredTransactions.size();
    };
  };

  func isInMonth(timestamp : Int, year : Int, month : Int) : Bool {
    let monthWithOffset = month - 1;
    (year == year and monthWithOffset == monthWithOffset);
  };
};

