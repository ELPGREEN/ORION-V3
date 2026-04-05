import jsPDF from "jspdf";

interface ReceiptData {
  receiptNumber: string;
  date: string;
  clientName: string;
  clientEmail: string;
  clientCpf?: string;
  description: string;
  tipoServico: string;
  amount: number;
  paymentMethod?: string;
  lawyerName?: string;
  lawyerOab?: string;
  officeName?: string;
  officeAddress?: string;
  officePhone?: string;
  officeEmail?: string;
  officeWebsite?: string;
}

export function generateReceipt(data: ReceiptData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const gold = [212, 175, 55] as [number, number, number];
  const dark = [15, 15, 15] as [number, number, number];
  const gray = [120, 120, 120] as [number, number, number];
  const lightGray = [200, 200, 200] as [number, number, number];

  // --- HEADER ---
  // Gold top bar
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 3, "F");

  // Office name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...dark);
  doc.text(data.officeName || "ELP Green Technology", margin, 22);

  // OAB + contacts
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(data.lawyerOab || "[OAB]", margin, 28);

  if (data.officeAddress) {
    doc.text(data.officeAddress, margin, 33);
  }
  const contactLine = [data.officePhone, data.officeEmail, data.officeWebsite]
    .filter(Boolean)
    .join("  •  ");
  if (contactLine) {
    doc.text(contactLine, margin, 38);
  }

  // Separator
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(margin, 43, pageWidth - margin, 43);

  // --- RECEIPT TITLE ---
  let y = 55;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...dark);
  doc.text("RECIBO DE PAGAMENTO", pageWidth / 2, y, { align: "center" });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`Nº ${data.receiptNumber}`, pageWidth / 2, y, { align: "center" });

  // --- CLIENT INFO BOX ---
  y += 14;
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, contentWidth, 35, 2, 2, "F");

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...gold);
  doc.text("DADOS DO CLIENTE", margin + 8, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(`Nome: ${data.clientName || "—"}`, margin + 8, y);

  y += 6;
  doc.setFontSize(9);
  doc.text(`E-mail: ${data.clientEmail || "—"}`, margin + 8, y);

  if (data.clientCpf) {
    y += 6;
    doc.text(`CPF: ${data.clientCpf}`, margin + 8, y);
  }

  // --- SERVICE DETAILS ---
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...gold);
  doc.text("DETALHES DO SERVIÇO", margin, y);

  y += 9;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);

  // Table header
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y - 4, contentWidth, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("Descrição", margin + 5, y + 2);
  doc.text("Valor", pageWidth - margin - 5, y + 2, { align: "right" });

  // Table row
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);

  const descLines = doc.splitTextToSize(data.description, contentWidth - 50);
  doc.text(descLines, margin + 5, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...gold);
  doc.text(
    `R$ ${data.amount.toFixed(2).replace(".", ",")}`,
    pageWidth - margin - 5,
    y,
    { align: "right" }
  );

  // Separator
  y += descLines.length * 5 + 8;
  doc.setDrawColor(...lightGray);
  doc.line(margin, y, pageWidth - margin, y);

  // --- PAYMENT INFO ---
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...gold);
  doc.text("INFORMAÇÕES DE PAGAMENTO", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...dark);

  const paymentInfo = [
    ["Data do Pagamento:", data.date],
    ["Forma de Pagamento:", data.paymentMethod || "Stripe (Cartão/Boleto/Pix)"],
    ["Status:", "PAGO ✓"],
  ];

  paymentInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(label, margin + 5, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(value, margin + 55, y);
    y += 6;
  });

  // --- TOTAL BOX ---
  y += 8;
  doc.setFillColor(...gold);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL PAGO", margin + 10, y + 12);
  doc.setFontSize(14);
  doc.text(
    `R$ ${data.amount.toFixed(2).replace(".", ",")}`,
    pageWidth - margin - 10,
    y + 12,
    { align: "right" }
  );

  // --- SIGNATURE AREA ---
  y += 35;
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.3);
  doc.line(margin + 20, y, pageWidth - margin - 20, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...dark);
  doc.text(
    data.lawyerName || "[Nome do Advogado]",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(
    data.lawyerOab || "[OAB]",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // --- FOOTER ---
  const footerY = 275;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    "Documento gerado eletronicamente. Honorários conforme tabela da OAB/RS.",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "Provimento 205/2021 e LGPD aplicáveis. Este recibo tem validade fiscal.",
    pageWidth / 2,
    footerY + 9,
    { align: "center" }
  );

  // Gold bottom bar
  doc.setFillColor(...gold);
  doc.rect(0, 294, pageWidth, 3, "F");

  return doc;
}

export function downloadReceipt(data: ReceiptData) {
  const doc = generateReceipt(data);
  doc.save(`recibo-${data.receiptNumber}.pdf`);
}
