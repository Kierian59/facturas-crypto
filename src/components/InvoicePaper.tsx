"use client";

import { QRCodeSVG } from "qrcode.react";
import type { Client, Invoice, Settings } from "@/lib/types";
import { formatDate, formatEur, formatNum, invoiceBase, irpfAmount, invoiceTotal } from "@/lib/format";
import { IVA_NOSUJETA } from "@/lib/tax";
import { countryName } from "@/lib/countries";
import { aeatCotejoUrl } from "@/lib/aeat";

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
  const clientCountry = client ? countryName(client.countryCode, "es") || client.country : "";
  const serviceDate = invoice.serviceDate || invoice.issueDate;
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
    <article className="print-sheet relative overflow-hidden bg-white text-[#1a1712] px-10 py-9 md:px-12 md:py-11 min-h-[1120px]">
      <div aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-[#9c4a2b]" />

      <header className="flex items-start justify-between gap-6 pl-3">
        <div>
          <p className="font-display text-[2.65rem] leading-[0.9] tracking-tight text-[#9c4a2b]">Factura</p>
          <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-[#7a7164]">
            Documento mercantil · EUR
          </p>
        </div>
        <div className="flex items-start gap-5">
          <div className="text-right space-y-2.5 min-w-[11rem]">
            <Meta k="Nº de factura" v={number} large />
            <Meta k="Fecha de emisión" v={formatDate(invoice.issueDate)} />
            <Meta k="Fecha de prestación" v={formatDate(serviceDate)} />
            {invoice.dueDate ? <Meta k="Vencimiento" v={formatDate(invoice.dueDate)} /> : null}
          </div>
          {cotejo ? (
            <div className="flex flex-col items-center">
              <div className="border border-[#1a1712] p-1 bg-white" style={{ width: "30mm", height: "30mm" }}>
                <QRCodeSVG
                  value={cotejo}
                  size={113}
                  level="M"
                  includeMargin={false}
                  style={{ width: "28mm", height: "28mm" }}
                />
              </div>
              <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#7a7164]">Verificar en la AEAT</p>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-10 border-y border-[#eadfcf] py-6 pl-3">
        <Party
          label="Emisor"
          name={settings.nombre || "Emisor"}
          lines={[
            settings.nif ? `NIF/NIE ${settings.nif}` : null,
            settings.direccion || "Dirección pendiente",
            cityLine || null,
            "España",
            settings.email || null,
            settings.activity || null,
          ]}
        />
        <Party
          label="Cliente"
          name={client?.brand ?? "—"}
          lines={[
            client?.taxId
              ? `${client.horsUE === false ? "NIF" : "Tax ID"} ${client.taxId}`
              : null,
            client?.address || null,
            clientCountry ? `${clientCountry}${client?.horsUE ? " · fuera de la UE" : ""}` : null,
            client?.email || null,
          ]}
        />
      </section>

      <section className="mt-7 pl-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a7164] mb-3">Concepto</p>
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-[#1a1712] text-[#fbf6ee]">
              <th className="py-2.5 px-3 text-left font-medium tracking-wide">Descripción</th>
              <th className="py-2.5 px-3 text-right font-medium w-[4.5rem]">Cant.</th>
              <th className="py-2.5 px-3 text-right font-medium w-[7.5rem]">Precio</th>
              <th className="py-2.5 px-3 text-right font-medium w-[7.5rem]">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className="border-b border-[#eadfcf] align-top">
                <td className="py-3 pr-3 pl-3">{it.description || "—"}</td>
                <td className="py-3 px-3 text-right tabular">{formatNum(it.quantity, "es")}</td>
                <td className="py-3 px-3 text-right tabular">{formatEur(it.unitPriceEur, "es")}</td>
                <td className="py-3 px-3 text-right tabular">{formatEur(it.quantity * it.unitPriceEur, "es")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 flex justify-end pl-3">
        <dl className="w-full max-w-[17rem] text-[13px]">
          <div className="flex justify-between gap-6 py-1">
            <dt className="text-[#4a4338]">Base imponible</dt>
            <dd className="tabular">{formatEur(base, "es")}</dd>
          </div>
          <div className="flex justify-between gap-6 py-1">
            <dt className="text-[#4a4338]">IVA</dt>
            <dd className="tabular">{formatEur(0, "es")}</dd>
          </div>
          {invoice.irpfRate > 0 ? (
            <div className="flex justify-between gap-6 py-1">
              <dt className="text-[#4a4338]">Retención IRPF ({formatNum(invoice.irpfRate, "es")} %)</dt>
              <dd className="tabular">− {formatEur(irpf, "es")}</dd>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between items-baseline gap-6 bg-[#1a1712] text-[#fbf6ee] px-3 py-2.5">
            <dt className="text-[10px] uppercase tracking-[0.16em]">Total</dt>
            <dd className="font-display text-2xl tabular leading-none">{formatEur(total, "es")}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-8 ml-3 border-l-[3px] border-[#9c4a2b] bg-[#fbf6ee] px-4 py-3 text-[11px] leading-relaxed">
        {client?.horsUE !== false ? (
          <>
            <p className="font-medium text-[12px]">IVA — operación no sujeta</p>
            <p className="mt-1">{IVA_NOSUJETA}</p>
            <p className="mt-1 text-[#4a4338]">
              Prestación de servicios a empresario o profesional establecido fuera de la Unión Europea.
              Lugar de realización: donde está establecido el destinatario.
            </p>
          </>
        ) : (
          <p>
            Cliente establecido en la UE: el tratamiento del IVA no se calcula automáticamente en esta
            versión (verificar: autoliquidación / ROI). Importe IVA mostrado: 0 EUR.
          </p>
        )}
        {invoice.irpfRate === 0 ? (
          <p className="mt-2 text-[#4a4338]">Retención IRPF: 0 % (cliente no establecido en España, por defecto).</p>
        ) : null}
      </section>

      <section className="mt-7 pl-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a7164]">Forma de pago</p>
        {invoice.payment ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-4">
              <PayCell k="Medio de pago" v="Criptomoneda" />
              <PayCell
                k="Criptomoneda"
                v={`${invoice.payment.asset}${invoice.payment.network ? ` · ${invoice.payment.network}` : ""}`}
              />
              <PayCell k="Valor de la operación" v={formatEur(invoice.payment.eurEquivalent, "es")} />
              <PayCell
                k="Fecha de pago"
                v={invoice.cobroDate ? formatDate(invoice.cobroDate) : "—"}
              />
            </div>
            <p className="mt-3 text-[11px] text-[#4a4338]">
              Conversión a EUR: realizada inmediatamente después de la recepción.
            </p>
            <p className="mt-1 text-[11px] text-[#4a4338]">
              {invoice.payment.amount} {invoice.payment.asset} = {formatEur(invoice.payment.eurEquivalent, "es")}{" "}
              · tipo 1 {invoice.payment.asset} = {formatEur(invoice.payment.rate, "es")} ·{" "}
              {formatDate(invoice.payment.rateDate)} · {invoice.payment.rateSource || "manual"}
            </p>
            {invoice.payment.walletAddress ? (
              <p className="mt-1 text-[10px] break-all text-[#7a7164]">Cartera: {invoice.payment.walletAddress}</p>
            ) : null}
            {invoice.payment.txHash ? (
              <p className="text-[10px] break-all text-[#7a7164]">Tx: {invoice.payment.txHash}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-4">
              <PayCell k="Medio de pago" v="Criptomoneda" />
              <PayCell k="Criptomoneda" v={settings.defaultAsset || "USDT"} />
              <PayCell k="Valor de la operación" v={formatEur(total, "es")} />
              <PayCell k="Fecha de pago" v="Pendiente" />
            </div>
            <p className="mt-3 text-[11px] text-[#4a4338]">
              Conversión a EUR: realizada inmediatamente después de la recepción.
            </p>
            {settings.wallets[0]?.address ? (
              <p className="mt-1 text-[10px] break-all text-[#7a7164]">
                Dirección {settings.wallets[0].asset} {settings.wallets[0].network}: {settings.wallets[0].address}
              </p>
            ) : null}
          </>
        )}
      </section>

      {invoice.notes ? (
        <p className="mt-6 pl-3 text-[12px] text-[#4a4338]">Notas: {invoice.notes}</p>
      ) : null}

      <footer className="mt-10 pt-4 ml-3 border-t border-[#eadfcf] text-[9px] leading-relaxed text-[#7a7164]">
        <p>
          Documento emitido en una serie secuencial ({settings.seriesPrefix}…): los números atribuidos
          no se reutilizan. Factura en EUR. Herramienta de gestión — no constituye un depósito AEAT /
          Verifactu. El QR tributario permite cotejar estos datos en la sede de la AEAT; este programa
          no remite el registro de facturación.
        </p>
        {invoice.huella ? (
          <p className="mt-1 break-all">
            Huella interna (SHA-256 local, no es la huella AEAT): {invoice.huella}
          </p>
        ) : null}
      </footer>
    </article>
  );
}

function Meta({ k, v, large }: { k: string; v: string; large?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.16em] text-[#7a7164]">{k}</p>
      <p className={large ? "mt-0.5 font-display text-[1.35rem] tabular leading-tight" : "mt-0.5 tabular"}>
        {v}
      </p>
    </div>
  );
}

function Party({ label, name, lines }: { label: string; name: string; lines: (string | null)[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a7164]">{label}</p>
      <p className="mt-1.5 font-display text-xl leading-tight">{name}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[#4a4338]">
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

function PayCell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em] text-[#7a7164]">{k}</p>
      <p className="mt-0.5 tabular">{v}</p>
    </div>
  );
}
