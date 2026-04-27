export type ExpenseCategory =
  | "food"
  | "rent"
  | "transport"
  | "fuel"
  | "shopping"
  | "health"
  | "utilities"
  | "entertainment"
  | "travel"
  | "other";

export type SplitType = "equal" | "custom";
export type AppRole = "admin" | "member";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  currency: string;
  identity_color: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  split_type: SplitType;
  expense_date: string;
  created_at: string;
  payer?: Profile | null;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
}

export interface Settlement {
  id: string;
  group_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  method: string;
  note: string | null;
  created_at: string;
}

export interface Balance {
  user_id: string;
  net: number; // positive => they are owed, negative => they owe
  profile?: Profile;
}

export interface DebtEdge {
  from_user: string;
  to_user: string;
  amount: number;
  from_profile?: Profile;
  to_profile?: Profile;
}
