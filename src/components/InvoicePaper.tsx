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
  const clientCountry = client
    ? countryName(client.countryCode, "es") || client.country
    : "";
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
    <article className="print-sheet bg-white text-[#1a1712] px-8 py-8 md:px-12 md:py-10 min-h-[1120px]">
      <header className="flex items-start justify-between gap-6 border-b border-[#d9cbb6] pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9c4a2b]">Factura</p>
          <h1 className="font-display text-3xl mt-1">{settings.nombre || "Emisor"}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#4a4338]">
            {settings.nif ? <>NIF/NIE {settings.nif}<br /></> : null}
            {settings.direccion || "Dirección pendiente"}
            {cityLine ? <><br />{cityLine}</> : null}
            <br />España
            {settings.email ? <><br />{settings.email}</> : null}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl tabular">{number}</p>
          <p className="text-sm mt-1">Fecha: {formatDate(invoice.issueDate)}</p>
          {invoice.dueDate ? <p className="text-sm">Vencimiento: {formatDate(invoice.dueDate)}</p> : null}
          {cotejo ? (
            <div className="mt-3 inline-flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#7a7164] mb-1">QR tributario</p>
              <div className="bg-white" style={{ width: "32mm", height: "32mm" }}>
                <QRCodeSVG value={cotejo} size={121} level="M" includeMargin={false} style={{ width: "32mm", height: "32mm" }} />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mt-6 grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a7164]">Emisor</p>
          <p className="mt-1 text-sm">{settings.activity}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a7164]">Cliente</p>
          <p className="mt-1 font-medium">{client?.brand ?? "—"}</p>
          <p className="text-sm text-[#4a4338]">
            {client?.address ? <>{client.address}<br /></> : null}
            {clientCountry}
            {client?.horsUE ? " · fuera de la UE" : ""}
            {client?.taxId ? <><br />NIF / Tax ID: {client.taxId}</> : null}
            {client?.email ? <><br />{client.email}</> : null}
          </p>
        </div>
      </section>

      <table className="mt-8 w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-[#1a1712] text-left">
            <th className="py-2 font-medium">Descripción</th>
            <th className="py-2 font-medium text-right w-16">Cantidad</th>
            <th className="py-2 font-medium text-right w-28">Precio EUR</th>
            <th className="py-2 font-medium text-right w-28">Importe</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id} className="border-b border-[#eadfcf] align-top">
              <td className="py-3 pr-3">{it.description || "—"}</td>
              <td className="py-3 text-right tabular">{formatNum(it.quantity, "es")}</td>
              <td className="py-3 text-right tabular">{formatEur(it.unitPriceEur, "es")}</td>
              <td className="py-3 text-right tabular">{formatEur(it.quantity * it.unitPriceEur, "es")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-sm text-sm space-y-1.5">
          <div className="flex justify-between gap-6">
            <dt>Base imponible</dt>
            <dd className="tabular">{formatEur(base, "es")}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>IVA</dt>
            <dd className="tabular">{formatEur(0, "es")}</dd>
          </div>
          {invoice.irpfRate > 0 ? (
            <div className="flex justify-between gap-6">
              <dt>Retención IRPF ({formatNum(invoice.irpfRate, "es")} %)</dt>
              <dd className="tabular">− {formatEur(irpf, "es")}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 border-t border-[#1a1712] pt-2 font-medium text-base">
            <dt>Total EUR</dt>
            <dd className="tabular">{formatEur(total, "es")}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-8 rounded-xl border border-[#eadfcf] bg-[#fbf6ee] px-4 py-3 text-xs leading-relaxed">
        {client?.horsUE !== false ? (
          <>
            <p className="font-medium">IVA — operación no sujeta</p>
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

      <section className="mt-6 text-sm">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#7a7164]">Forma de pago</p>
        {invoice.payment ? (
          <div className="mt-1 leading-relaxed">
            <p>
              Criptomoneda: {invoice.payment.amount} {invoice.payment.asset}
              {invoice.payment.network ? ` (${invoice.payment.network})` : ""} = {formatEur(invoice.payment.eurEquivalent, "es")}
            </p>
            <p>
              Tipo de cambio registrado: 1 {invoice.payment.asset} = {formatEur(invoice.payment.rate, "es")} ·{" "}
              {formatDate(invoice.payment.rateDate)} · {invoice.payment.rateSource || "manual"}
            </p>
            {invoice.payment.walletAddress ? (
              <p className="break-all">Cartera: {invoice.payment.walletAddress}</p>
            ) : null}
            {invoice.payment.txHash ? (
              <p className="break-all">Tx: {invoice.payment.txHash}</p>
            ) : null}
            {invoice.cobroDate ? <p>Fecha de cobro: {formatDate(invoice.cobroDate)}</p> : null}
          </div>
        ) : (
          <p className="mt-1 text-[#4a4338]">
            Pago en criptomoneda ({settings.defaultAsset || "USDT"}), equivalente en EUR.
            {settings.wallets[0]?.address ? (
              <>
                <br />
                Dirección {settings.wallets[0].asset} {settings.wallets[0].network}:{" "}
                <span className="break-all">{settings.wallets[0].address}</span>
              </>
            ) : null}
          </p>
        )}
      </section>

      {invoice.notes ? (
        <p className="mt-6 text-sm text-[#4a4338]">Notas: {invoice.notes}</p>
      ) : null}

      <footer className="mt-12 pt-4 border-t border-[#eadfcf] text-[10px] leading-relaxed text-[#7a7164]">
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
