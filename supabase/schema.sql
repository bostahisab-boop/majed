-- হিসাব — অ্যাকাউন্টিং সফটওয়্যার (React + Supabase)
-- Supabase SQL Editor-এ এই পুরো ফাইলটি রান করুন।

create extension if not exists "uuid-ossp";

-- ============ কোম্পানি (মাল্টি-কোম্পানি) ============
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text default '',
  phone text default '',
  created_at timestamptz not null default now()
);

-- ============ গ্রাহক / সরবরাহকারী / প্রোডাক্ট ============
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text default '',
  address text default '',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text default '',
  address text default '',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  sku text default '',
  unit text default 'পিস',
  purchase_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  opening_stock numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ============ ভাউচার (দিনবইয়ের মূল টেবিল) ============
-- voucher_type: receipt | payment | journal | sale | purchase | expense
create table if not exists vouchers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  voucher_no text not null,
  voucher_type text not null,
  voucher_date date not null default current_date,
  party_type text,
  party_id uuid,
  total_amount numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  method text default 'নগদ',
  expense_head text,
  notes text default '',
  created_at timestamptz not null default now()
);

-- ডাবল এন্ট্রি লাইন
create table if not exists voucher_lines (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  account text not null,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  description text default ''
);

-- ইনভয়েস আইটেম (বিক্রয়/ক্রয় চালানের পণ্য)
create table if not exists invoice_items (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  qty numeric(14,2) not null default 0,
  rate numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  description text default ''
);

-- স্টক চলাচল (প্রোডাক্ট লেজার)
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid references vouchers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  movement_date date not null default current_date,
  qty_in numeric(14,2) not null default 0,
  qty_out numeric(14,2) not null default 0,
  rate numeric(14,2) not null default 0
);

-- ============ ইনডেক্স ============
create index if not exists idx_vouchers_company_date on vouchers(company_id, voucher_date);
create index if not exists idx_vouchers_party on vouchers(company_id, party_id);
create index if not exists idx_vouchers_type on vouchers(company_id, voucher_type);
create index if not exists idx_lines_voucher on voucher_lines(voucher_id);
create index if not exists idx_lines_company on voucher_lines(company_id, account);
create index if not exists idx_items_voucher on invoice_items(voucher_id);
create index if not exists idx_moves_company_product on stock_movements(company_id, product_id);

-- ============ RLS (এই অ্যাপে সরলতার জন্য anon access অনুমোদিত) ============
-- প্রোডাকশনে ব্যবহার করলে Supabase Auth যোগ করে নিচের পলিসি আপডেট করুন।
alter table companies enable row level security;
alter table customers enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table vouchers enable row level security;
alter table voucher_lines enable row level security;
alter table invoice_items enable row level security;
alter table stock_movements enable row level security;

do $$
declare t text;
begin
  foreach t in array array['companies','customers','suppliers','products','vouchers','voucher_lines','invoice_items','stock_movements']
  loop
    execute format('drop policy if exists "allow_all_%1$s" on %1$s', t);
    execute format('create policy "allow_all_%1$s" on %1$s for all using (true) with check (true)', t);
  end loop;
end $$;
