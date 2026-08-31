# Database Schema (Core Models)

Money is always integer **cents**. `User.id` is ALWAYS the Clerk `userId`
(string like `user_2ab...`) — there is no separate internal id.

**1. User** — mirror of the Clerk user, synced via webhook
- `id`: String @id  (the Clerk userId)
- `email`: String @unique
- `name`: String
- `imageUrl`: String?

**2. Group**
- `id`: String @id @default(cuid())
- `name`: String
- `members`: GroupMember[]
- `expenses`: Expense[]

**3. GroupMember** (join table)
- `groupId` + `userId` composite unique
- `role`: "admin" | "member"

**4. Expense**
- `id`: String @id @default(cuid())
- `groupId`: String
- `paidById`: String  (User who paid the bill)
- `amountCents`: Int  (USD — the ledger currency; balances math on this)
- `description`: String
- `currency`: String  (entry currency, one of the 20 ECB codes; default "USD")
- `nativeAmountCents`: Int  (the amount as entered in `currency`)
- `splits`: ExpenseSplit[]  (one row per member who owes a share, in USD cents)
- `createdAt`: DateTime

**5. ExpenseSplit** (who owes what for a given expense)
- `expenseId`: String
- `userId`: String  (the debtor for this share)
- `amountCents`: Int  (this member's share; splits sum to expense amount)

**6. Settlement** (a recorded "settle up" payment)
- `id`: String @id @default(cuid())
- `groupId`: String
- `fromUserId`: String  (who paid)
- `toUserId`: String    (who received)
- `amountCents`: Int
- `createdAt`: DateTime

## Derived data — NOT stored

Debts are **computed, not stored**. Net balance per member =
(everything they paid) − (their share of every expense)
± settlements. The simplified who-owes-whom list is produced by the
debt-minimization algorithm in `lib/simplify-debts.ts` at read time.
Storing a `Debt` table invites drift; we derive it.
