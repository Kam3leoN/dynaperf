import { useMemo } from "react";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { buildQrShapeInnerFragments, type QrShapeLibraryRow } from "@/lib/qrShapeMarkup";
import { encodedPayloadForRecord, logoUrlForExport } from "@/lib/qrRecordHelpers";
import type { QrRecord } from "@/types/qrCodeRecord";

export function QrSavedCardPreview({
  record,
  shapeById,
}: {
  record: QrRecord;
  shapeById: Map<string, QrShapeLibraryRow>;
}) {
  const fr = useMemo(
    () => (shapeById.size > 0 ? buildQrShapeInnerFragments(record.qrStyle, shapeById) : null),
    [record.qrStyle, shapeById],
  );
  return (
    <QrStylingPreview
      value={encodedPayloadForRecord(record)}
      size={Math.min(200, record.size)}
      fgColor={record.fgColor}
      bgColor={record.bgColor}
      level={record.level}
      logoUrl={logoUrlForExport(record)}
      style={record.qrStyle}
      shapeInnerFragments={fr}
    />
  );
}
