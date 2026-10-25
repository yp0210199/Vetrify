sed -i '/export \* from '\''\.\/taxService'\'';/a \
export * from '\''./gstService'\'';\
export * from '\''./accountingService'\'';\
export * from '\''./eInvoiceService'\'';\
' src/services/index.ts
