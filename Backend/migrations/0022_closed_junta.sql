CREATE TABLE "index_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"index_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"timestamp" integer NOT NULL,
	"nav" text NOT NULL,
	"weights" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "index_events_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "mint_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"chain_id" varchar(20) NOT NULL,
	"address" varchar(66) NOT NULL,
	"client_order_id" varchar(100) NOT NULL,
	"payment_id" varchar(100),
	"symbol" varchar(50) NOT NULL,
	"amount_paid" numeric(18, 8) NOT NULL,
	"amount_remaining" numeric(18, 8) DEFAULT '0' NOT NULL,
	"exchange_fee" numeric(18, 8) DEFAULT '0' NOT NULL,
	"management_fee" numeric(18, 8) DEFAULT '0' NOT NULL,
	"assets_value" numeric(18, 8) DEFAULT '0' NOT NULL,
	"filled_quantity" numeric(18, 8) DEFAULT '0' NOT NULL,
	"fill_rate" numeric(18, 8) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"lots" jsonb,
	"position" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mint_invoices_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "unique_client_order_id" UNIQUE("chain_id","address","client_order_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"twitter" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "temp_top20_rebalances" (
	"id" serial PRIMARY KEY NOT NULL,
	"index_id" varchar(66) NOT NULL,
	"weights" text NOT NULL,
	"prices" jsonb NOT NULL,
	"timestamp" bigint NOT NULL,
	"coins" jsonb NOT NULL,
	"deployed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "temp_top20_rebalances_index_id_timestamp_unique" UNIQUE("index_id","timestamp")
);
