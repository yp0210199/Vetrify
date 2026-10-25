sed -i '/    '\''settings.read'\'',/a \
    '\''gst.view'\'',\
    '\''gst.export'\'',\
    '\''gst.prepare'\'',\
    '\''gst.reconcile'\'',\
    '\''accounting.view'\'',\
    '\''einvoice.generate'\'',' src/services/roleResolverService.ts

sed -i '/    '\''stock_transfer.receive'\'',/a \
    '\''gst.view'\'',\
    '\''accounting.view'\'',' src/services/roleResolverService.ts
