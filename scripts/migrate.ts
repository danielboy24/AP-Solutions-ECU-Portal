import {pool} from '../lib/db';
async function main(){await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,name text NOT NULL,password_hash text NOT NULL,role text NOT NULL CHECK(role IN ('admin','dealer')),credits integer NOT NULL DEFAULT 0 CHECK(credits>=0),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),vehicle text NOT NULL,ecu text NOT NULL,service text NOT NULL,notes text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),original_key text NOT NULL,original_name text NOT NULL,result_key text,result_name text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS shopify_events(webhook_id text PRIMARY KEY,shop_domain text NOT NULL,topic text NOT NULL,order_id text NOT NULL,received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS shopify_credit_grants(shop_domain text NOT NULL,order_id text NOT NULL,user_id uuid NOT NULL REFERENCES users(id),credits integer NOT NULL CHECK(credits>0),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(shop_domain,order_id));
CREATE TABLE IF NOT EXISTS shopify_credit_pending(shop_domain text NOT NULL,order_id text NOT NULL,email text NOT NULL,credits integer NOT NULL CHECK(credits>0),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(shop_domain,order_id));
CREATE TABLE IF NOT EXISTS service_prices(name text PRIMARY KEY,credits integer NOT NULL CHECK(credits>=0),active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS credit_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),delta integer NOT NULL,reason text NOT NULL,admin_id uuid REFERENCES users(id),order_id uuid REFERENCES orders(id),created_at timestamptz NOT NULL DEFAULT now());
`);
await pool.query(`INSERT INTO service_prices(name,credits) VALUES ('Stage 1',1),('Stage 2',2),('Custom calibration review',4),('Diagnostic assistance',1) ON CONFLICT(name) DO NOTHING`);
console.log('Database ready');await pool.end()}
main().catch(e=>{console.error(e);process.exit(1)})