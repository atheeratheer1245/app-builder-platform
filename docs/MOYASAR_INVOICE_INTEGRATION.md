# Moyasar paid-export integration notes

The paid export path uses Moyasar **Invoices API**, rather than collecting card data in App Builder. The server creates an invoice at `POST https://api.moyasar.com/v1/invoices` with an integer amount in halalas, `SAR`, a description, and project/export metadata. Moyasar returns an invoice identifier, a hosted checkout `url`, and an invoice status. The returned URL is the only payment page presented to the payer.

The server must verify an invoice using `GET https://api.moyasar.com/v1/invoices/:id` with HTTP Basic authentication and confirm all three values before treating an export as paid: `status === "paid"`, the expected amount, and `currency === "SAR"`. A payment callback is supplementary evidence only; it must never unlock an artifact without the server-side fetch verification.

Free exports remain outside the payment workflow. A paid export may become downloadable only when its invoice is verified paid **and** its build job contains a real artifact URL. No code may fabricate an APK, AAB, IPA, payment result, or download URL.

## Official sources

- [Moyasar API introduction](https://docs.moyasar.com/api/api-introduction)
- [Create Invoice](https://docs.moyasar.com/api/invoices/01-create-invoice)
- [Fetch Invoice](https://docs.moyasar.com/api/invoices/04-show-invoice)
- [Create Payment security guidance](https://docs.moyasar.com/guides/card-payments/min-integration)
