const PDFDocument = require('pdfkit');

/**
 * Generates a clean, branded PDF invoice and streams it to the HTTP response.
 * @param {Object} order - Full order details with items
 * @param {Object} res - Express response object
 */
function generateInvoicePdf(order, res) {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    info: {
      Title: `Invoice ${order.order_number}`,
      Author: 'EncoderX Store',
      Subject: `Tax Invoice for Order ${order.order_number}`
    }
  });

  // Set response headers for inline PDF display
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="Invoice-${order.order_number}.pdf"`
  );

  // Pipe the PDF stream to Express response
  doc.pipe(res);

  // --- 1. Header & Branding ---
  doc
    .fillColor('#6366f1')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('EncoderX Store', 50, 50);

  doc
    .fillColor('#94a3b8')
    .fontSize(9)
    .font('Helvetica')
    .text('Batch 02 Full-Stack Platform Showcase', 50, 76)
    .text('support@encoderx.store | https://store.encoderx.dev', 50, 88);

  // INVOICE text on the right
  doc
    .fillColor('#0f172a')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('TAX INVOICE', 350, 50, { align: 'right' });

  doc
    .fillColor('#64748b')
    .fontSize(9)
    .font('Helvetica')
    .text(`Invoice Number: ${order.order_number}`, 350, 75, { align: 'right' })
    .text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 88, { align: 'right' })
    .text(`Payment Status: ${order.payment_status || 'Paid'} (${order.payment_method || 'Card'})`, 350, 101, { align: 'right' });

  // Divider line
  doc
    .moveTo(50, 125)
    .lineTo(545, 125)
    .strokeColor('#e2e8f0')
    .lineWidth(1)
    .stroke();

  // --- 2. Customer & Shipping Info ---
  const customerY = 145;

  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILLED & SHIPPED TO:', 50, customerY);

  doc
    .fillColor('#334155')
    .fontSize(10)
    .font('Helvetica')
    .text(order.customer_name, 50, customerY + 18)
    .text(order.customer_email, 50, customerY + 32)
    .text(order.shipping_address, 50, customerY + 46)
    .text(`${order.city}, ${order.state} ${order.zip_code}`, 50, customerY + 60);

  if (order.phone) {
    doc.text(`Phone: ${order.phone}`, 50, customerY + 74);
  }

  // Order Details Box on the right
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('FULFILLMENT DETAILS:', 350, customerY);

  doc
    .fillColor('#334155')
    .fontSize(10)
    .font('Helvetica')
    .text(`Fulfillment Status: ${order.order_status || 'Processing'}`, 350, customerY + 18)
    .text('Carrier: Express Courier', 350, customerY + 32)
    .text('Estimated Delivery: 2-3 Business Days', 350, customerY + 46);

  // --- 3. Items Table ---
  const tableTopY = 245;

  // Table Header Background
  doc
    .rect(50, tableTopY, 495, 24)
    .fillColor('#f8fafc')
    .fill();

  // Table Header Text
  doc
    .fillColor('#475569')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('ITEM DESCRIPTION', 60, tableTopY + 7)
    .text('PRICE', 330, tableTopY + 7, { width: 60, align: 'right' })
    .text('QTY', 400, tableTopY + 7, { width: 40, align: 'center' })
    .text('TOTAL', 450, tableTopY + 7, { width: 85, align: 'right' });

  // Draw Table Header Border
  doc
    .rect(50, tableTopY, 495, 24)
    .strokeColor('#cbd5e1')
    .lineWidth(0.75)
    .stroke();

  let currentY = tableTopY + 24;
  const items = order.items || [];

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc
        .rect(50, currentY, 495, 24)
        .fillColor('#fafafa')
        .fill();
    }

    doc
      .fillColor('#1e293b')
      .fontSize(9)
      .font('Helvetica')
      .text(item.product_name || `Product #${item.product_id}`, 60, currentY + 7, { width: 260, ellipsis: true })
      .text(`$${Number(item.unit_price).toFixed(2)}`, 330, currentY + 7, { width: 60, align: 'right' })
      .text(String(item.quantity), 400, currentY + 7, { width: 40, align: 'center' })
      .text(`$${Number(item.subtotal).toFixed(2)}`, 450, currentY + 7, { width: 85, align: 'right' });

    doc
      .rect(50, currentY, 495, 24)
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .stroke();

    currentY += 24;
  });

  // --- 4. Totals & Calculation Summary ---
  currentY += 15;
  const totalsLeft = 330;
  const valuesRight = 535;

  function renderSummaryLine(label, value, isBold = false, color = '#334155') {
    doc
      .fillColor(color)
      .fontSize(9)
      .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, totalsLeft, currentY, { width: 110, align: 'right' })
      .text(value, totalsLeft + 115, currentY, { width: 90, align: 'right' });
    currentY += 18;
  }

  renderSummaryLine('Subtotal:', `$${Number(order.subtotal).toFixed(2)}`);

  if (Number(order.discount) > 0) {
    renderSummaryLine('Discount:', `-$${Number(order.discount).toFixed(2)}`, false, '#10b981');
  }

  renderSummaryLine('Sales Tax (8%):', `$${Number(order.tax).toFixed(2)}`);
  renderSummaryLine(
    'Shipping:',
    Number(order.shipping_fee) === 0 ? 'FREE' : `$${Number(order.shipping_fee).toFixed(2)}`
  );

  // Divider above Grand Total
  doc
    .moveTo(totalsLeft, currentY)
    .lineTo(valuesRight, currentY)
    .strokeColor('#6366f1')
    .lineWidth(1.5)
    .stroke();

  currentY += 6;

  doc
    .fillColor('#0f172a')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL PAID:', totalsLeft, currentY, { width: 110, align: 'right' })
    .text(`$${Number(order.total_price).toFixed(2)}`, totalsLeft + 115, currentY, { width: 90, align: 'right' });

  // --- 5. Footer & Authenticity Badge ---
  const footerY = 730;

  doc
    .rect(50, footerY - 15, 495, 1)
    .fillColor('#e2e8f0')
    .fill();

  doc
    .fillColor('#64748b')
    .fontSize(8)
    .font('Helvetica')
    .text(
      'Thank you for your business! This is a system-generated electronic tax receipt.',
      50,
      footerY,
      { align: 'center', width: 495 }
    )
    .text(
      'EncoderX Remote Internship — Batch 02 Full-Stack Platform',
      50,
      footerY + 12,
      { align: 'center', width: 495 }
    );

  // Finalize PDF
  doc.end();
}

module.exports = { generateInvoicePdf };
