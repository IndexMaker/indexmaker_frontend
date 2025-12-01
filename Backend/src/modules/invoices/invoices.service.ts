import { Injectable, Logger } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { mintInvoices } from 'src/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { MintInvoice } from 'src/common/types/index.types';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private dbService: DbService) {}

  async fetchFromExternalAPI(
    from: string,
    to: string,
  ): Promise<MintInvoice[]> {
    try {
      const externalApiUrl =
        process.env.EXTERNAL_ISSUER_API ||
        'https://www.indexmaker.global/api/v1';
      const url = `${externalApiUrl}/mint_invoices/from/${from}/to/${to}`;

      this.logger.log(`Fetching invoices from external API: ${url}`);

      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch mint invoices (${response.status})`,
        );
      }

      const invoices = await response.json();
      this.logger.log(`Fetched ${invoices.length} invoices from external API`);

      // Store invoices in database
      if (invoices.length > 0) {
        await this.syncInvoicesToDatabase(invoices);
      }

      return invoices;
    } catch (error) {
      this.logger.error('Failed to fetch invoices from external API:', error);
      throw error;
    }
  }

  async syncInvoicesToDatabase(invoices: MintInvoice[]): Promise<void> {
    const db = this.dbService.getDb();

    for (const invoice of invoices) {
      try {
        const invoiceId =
          invoice.payment_id || invoice.client_order_id || `invoice_${Date.now()}`;

        const invoiceData = {
          invoiceId,
          chainId: invoice.chain_id,
          address: invoice.address,
          clientOrderId: invoice.client_order_id,
          paymentId: invoice.payment_id || null,
          symbol: invoice.symbol,
          amountPaid: invoice.amount_paid?.toString() || '0',
          amountRemaining: invoice.amount_remaining?.toString() || '0',
          exchangeFee: invoice.exchange_fee?.toString() || '0',
          managementFee: invoice.management_fee?.toString() || '0',
          assetsValue: invoice.assets_value?.toString() || '0',
          filledQuantity: invoice.filled_quantity?.toString() || '0',
          fillRate: invoice.fill_rate?.toString() || '0',
          status: invoice.status || 'pending',
          timestamp: invoice.timestamp ? new Date(invoice.timestamp) : new Date(),
          updatedAt: invoice.updated_at
            ? new Date(invoice.updated_at)
            : new Date(),
              lots: invoice.lots ? JSON.stringify(invoice.lots) : null,
          position: invoice.position ? JSON.stringify(invoice.position) : null,
        };

        // Check if invoice exists
        const existing = await db
          .select()
          .from(mintInvoices)
          .where(
            and(
              eq(mintInvoices.chainId, invoiceData.chainId),
              eq(mintInvoices.address, invoiceData.address),
              eq(mintInvoices.clientOrderId, invoiceData.clientOrderId),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing invoice
          await db
            .update(mintInvoices)
            .set({
              amountPaid: invoiceData.amountPaid,
              amountRemaining: invoiceData.amountRemaining,
              exchangeFee: invoiceData.exchangeFee,
              managementFee: invoiceData.managementFee,
              assetsValue: invoiceData.assetsValue,
              filledQuantity: invoiceData.filledQuantity,
              fillRate: invoiceData.fillRate,
              status: invoiceData.status,
              updatedAt: invoiceData.updatedAt,
              lots: invoiceData.lots,
              position: invoiceData.position,
              paymentId: invoiceData.paymentId,
            })
            .where(eq(mintInvoices.id, existing[0].id));
        } else {
          // Insert new invoice
          await db.insert(mintInvoices).values(invoiceData);
        }
      } catch (error) {
        this.logger.error(
          `Failed to sync invoice ${invoice.client_order_id}:`,
          error,
        );
      }
    }
  }

  async getInvoicesFromDatabase(
    from: Date,
    to: Date,
  ): Promise<MintInvoice[]> {
    const db = this.dbService.getDb();

    try {
      const results = await db
        .select()
        .from(mintInvoices)
        .where(
          and(
            gte(mintInvoices.timestamp, from),
            lte(mintInvoices.timestamp, to),
          ),
        )
        .orderBy(mintInvoices.timestamp);

      return results.map((row) => this.mapDbRowToInvoice(row));
    } catch (error) {
      this.logger.error('Failed to fetch invoices from database:', error);
      return [];
    }
  }

  async getInvoiceById(
    chainId: string,
    address: string,
    clientOrderId: string,
  ): Promise<MintInvoice | null> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .select()
        .from(mintInvoices)
        .where(
          and(
            eq(mintInvoices.chainId, chainId),
            eq(mintInvoices.address, address),
            eq(mintInvoices.clientOrderId, clientOrderId),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return this.mapDbRowToInvoice(result[0]);
    } catch (error) {
      this.logger.error('Failed to fetch invoice from database:', error);
      return null;
    }
  }

  private mapDbRowToInvoice(row: any): MintInvoice {
    return {
      id: row.invoiceId,
      chain_id: row.chainId,
      address: row.address,
      client_order_id: row.clientOrderId,
      payment_id: row.paymentId || '',
      symbol: row.symbol,
      amount_paid: parseFloat(row.amountPaid || '0'),
      amount_remaining: parseFloat(row.amountRemaining || '0'),
      exchange_fee: parseFloat(row.exchangeFee || '0'),
      management_fee: parseFloat(row.managementFee || '0'),
      assets_value: parseFloat(row.assetsValue || '0'),
      filled_quantity: parseFloat(row.filledQuantity || '0'),
      fill_rate: parseFloat(row.fillRate || '0'),
      status: (row.status || 'pending') as 'pending' | 'completed' | 'failed',
      timestamp: row.timestamp?.toISOString() || new Date().toISOString(),
      updated_at: row.updatedAt?.toISOString() || new Date().toISOString(),
      lots: row.lots
        ? typeof row.lots === 'string'
          ? JSON.parse(row.lots)
          : row.lots
        : [],
      position: row.position
        ? typeof row.position === 'string'
          ? JSON.parse(row.position)
          : row.position
        : undefined,
    };
  }
}
