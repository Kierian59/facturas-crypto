"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Client, Invoice, Settings } from "@/lib/types";
import { formatDate, formatEur, formatNum, invoiceBase, irpfAmount, invoiceTotal } from "@/lib/format";
import { IVA_NOSUJETA } from "@/lib/tax";
import { clientCountryEs } from "@/lib/countries";
import { aeatCotejoUrl } from "@/lib/aeat";

/**
 * Factura (siempre en español). Estilo sobrio: negro sobre blanco, filetes finos.
 * La misma maqueta sirve para la vista en pantalla y para imprimir / guardar en PDF.
 */
export function InvoicePaper({
  invoice,
  client,
  settings,
}: {
  invoice: Invoice;
  client: Client | undefined;
  settings: Settings;
}) {
  const base = invoiceBase(invoice.items);
  const irpf = irpfAmount(base, invoice.irpfRate);
  const total = invoiceTotal(base, invoice.irpfRate);
  const number = invoice.number ?? "BORRADOR";
  const cityLine = [settings.cp, settings.ciudad].filter(Boolean).join(" ");
  const issuerAddress = [settings.direccion || "Dirección pendiente", cityLine].filter(Boolean).join(", ");
  const clientCountry = clientCountryEs(client);
  const serviceDate = invoice.serviceDate || invoice.issueDate;
  const asset = (invoice.payment?.asset || settings.defaultAsset || "").trim() || "USDT";
  const cotejo =
    invoice.number && invoice.status !== "brouillon"
      ? aeatCotejoUrl({
          nif: settings.nif,
          numserie: invoice.number,
          issueDate: invoice.issueDate,
          total,
        })
      : null;

  return (
    <article
      className="print-sheet relative bg-white text-black px-10 py-10 md:px-12 md:py-12 text-[12px] leading-snug"
      style={{ fontFamily: "Helvetica, Arial, 'Liberation Sans', sans-serif" }}
    >
      <header className="relative">
        <h1 className="text-center text-[28px] font-bold tracking-wide leading-none">FACTURA</h1>
        <div className="absolute right-0 top-0 text-right text-[11px] leading-[1.4] tabular">
          <p>{number}</p>
          <p>Fecha de emisión: {formatDate(invoice.issueDate)}</p>
          <p>Fecha de prestación: {formatDate(serviceDate)}</p>
        </div>
      </header>

      <section className="mt-16 grid grid-cols-2 border border-black">
        <Party
          label="EMISOR"
          name={settings.nombre || "Emisor"}
          lines={[settings.nif ? `NIF: ${settings.nif}` : null, issuerAddress, "España"]}
        />
        <Party
          label="CLIENTE"
          name={client?.brand ?? "—"}
          lines={[
            client?.address || null,
            clientCountry || null,
            client?.taxId ? `Tax Identification No.: ${client.taxId}` : null,
          ]}
          divider
        />
      </section>

      <section className="mt-10">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1.5 pr-3 text-left font-bold">Descripción del servicio</th>
              <th className="pb-1.5 text-right font-bold w-[8rem]">Importe</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="pt-3 pr-3 whitespace-pre-line">
                  {it.description || "—"}
                  {it.quantity !== 1 ? (
                    <span className="block text-[10px]">
                      {formatNum(it.quantity, "es")} × {formatEur(it.unitPriceEur, "es")}
                    </span>
                  ) : null}
                </td>
                <td className="pt-3 text-right tabular whitespace-nowrap">
                  {formatEur(it.quantity * it.unitPriceEur, "es")}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="border-b border-black pt-3" />
            </tr>
          </tfoot>
        </table>

        <dl className="mt-4 text-[12px]">
          <Row k="Base imponible" v={formatEur(base, "es")} />
          <Row k="IVA" v={formatEur(0, "es")} />
          {invoice.irpfRate > 0 ? (
            <Row k={`Retención IRPF (${formatNum(invoice.irpfRate, "es")} %)`} v={`− ${formatEur(irpf, "es")}`} />
          ) : null}
          <Row k="TOTAL" v={formatEur(total, "es")} bold />
        </dl>
      </section>

      <section className="mt-8 space-y-2 text-[10px] leading-relaxed">
        {client?.horsUE !== false ? (
          <p>
            IVA: Operación no sujeta al IVA español conforme al artículo 69.Uno.1º de la Ley 37/1992 del
            IVA, por tratarse de una prestación de servicios a un empresario o profesional establecido
            fuera del territorio de aplicación del IVA español.
          </p>
        ) : (
          <p>
            IVA: cliente establecido en la UE; el tratamiento del IVA no se calcula automáticamente
            (verificar: autoliquidación / ROI). Importe IVA mostrado: {formatEur(0, "es")}.
          </p>
        )}
        {invoice.irpfRate === 0 ? (
          <p>
            Retención IRPF: {formatEur(0, "es")} — sin retención de IRPF al no estar el pagador establecido en
            España, sujeto a la correcta condición del pagador.
          </p>
        ) : null}
        <p>Forma de pago: Activos digitales ({asset}).</p>
        <p>
          Valoración: los {asset} recibidos se registrarán en euros según su valor de mercado en la fecha
          y hora de recepción. Valor de referencia de esta factura: {formatEur(total, "es")}.
        </p>
        {invoice.notes ? <p className="whitespace-pre-line">{invoice.notes}</p> : null}
      </section>

      {cotejo ? (
        <div className="mt-8 flex items-end gap-2">
          <div className="border border-black p-0.5 bg-white" style={{ width: "20mm", height: "20mm" }}>
            <QRCodeSVG
              value={cotejo}
              size={76}
              level="M"
              includeMargin={false}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <p className="text-[8px]">Cotejar en la AEAT</p>
        </div>
      ) : null}
    </article>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-0.5 ${bold ? "font-bold text-[13px]" : ""}`}>
      <dt>{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}

function Party({
  label,
  name,
  lines,
  divider,
}: {
  label: string;
  name: string;
  lines: (string | null)[];
  divider?: boolean;
}) {
  return (
    <div className={`px-3 py-3 ${divider ? "border-l border-black" : ""}`}>
      <p className="font-bold">{label}</p>
      <p className="mt-2 font-bold">{name}</p>
      <p className="mt-0.5 leading-relaxed">
        {lines.filter(Boolean).map((line, i) => (
          <span key={`${i}-${line}`}>
            {i > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}
