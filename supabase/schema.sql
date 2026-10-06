-- PriceCheck AI V3 database schema
create table retailers (id uuid primary key, name text not null unique, website text, active boolean default true);
create table products (id uuid primary key, canonical_name text not null, brand text, model text, category text not null, specs jsonb default '{}');
create table offers (id uuid primary key, product_id uuid references products(id), retailer_id uuid references retailers(id), url text not null, price_zar numeric(12,2) not null, in_stock boolean, last_seen_at timestamptz default now());
create table price_history (id bigserial primary key, offer_id uuid references offers(id), price_zar numeric(12,2) not null, recorded_at timestamptz default now());
create table alerts (id uuid primary key, user_id uuid, product_id uuid references products(id), target_price_zar numeric(12,2) not null, active boolean default true, created_at timestamptz default now());
create index offers_product_idx on offers(product_id);
create index offers_price_idx on offers(price_zar);
