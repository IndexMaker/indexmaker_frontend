import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from 'src/modules/invoices/invoices.service';

@ApiTags('mint_invoices')
@Controller('mint_invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('from/:from/to/:to')
  @ApiOperation({ summary: 'Get mint invoices by date range' })
  @ApiParam({ name: 'from', description: 'Start date (ISO format)' })
  @ApiParam({ name: 'to', description: 'End date (ISO format)' })
  async getInvoicesByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
  ) {
    try {
      // First try to get from database
      const fromDate = new Date(from);
      const toDate = new Date(to);

      let invoices = await this.invoicesService.getInvoicesFromDatabase(
        fromDate,
        toDate,
      );

      // If no invoices in database, try to fetch from external API
      if (invoices.length === 0) {
        invoices = await this.invoicesService.fetchFromExternalAPI(from, to);
      }

      return invoices;
    } catch (error) {
      // If external API fails, return empty array instead of error
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  @Get('invoice/:chainId/:address/:clientOrderId')
  @ApiOperation({ summary: 'Get mint invoice by ID' })
  @ApiParam({ name: 'chainId', description: 'Chain ID' })
  @ApiParam({ name: 'address', description: 'Contract address' })
  @ApiParam({ name: 'clientOrderId', description: 'Client order ID' })
  async getInvoiceById(
    @Param('chainId') chainId: string,
    @Param('address') address: string,
    @Param('clientOrderId') clientOrderId: string,
  ) {
    try {
      // First try database
      let invoice = await this.invoicesService.getInvoiceById(
        chainId,
        address,
        clientOrderId,
      );

      // If not found, try external API
      if (!invoice) {
        // Fetch a date range that might include this invoice
        const now = new Date();
        const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
        const to = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow

        const fromStr = from.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const toStr = to.toISOString().split('T')[0] + 'T23:59:59.000Z';

        const invoices = await this.invoicesService.fetchFromExternalAPI(
          fromStr,
          toStr,
        );

        invoice =
          invoices.find(
            (inv) =>
              inv.chain_id === chainId &&
              inv.address === address &&
              inv.client_order_id === clientOrderId,
          ) || null;
      }

      return invoice || null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }
}
