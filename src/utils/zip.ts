/**
 * ZIP Storage (método STORE) — compactação sem dependências externas.
 * Adequada para MP4 (já comprimidos), evitando inflar binários com DEFLATE.
 */

interface ZipFileInput {
  name: string;
  blob: Blob;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function dosDate(): { time: number; date: number } {
  const now = new Date();
  const time =
    (now.getHours() << 11) |
    (now.getMinutes() << 5) |
    Math.floor(now.getSeconds() / 2);
  const date =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();
  return { time, date };
}

async function buildLocalHeader(
  name: string,
  data: Uint8Array
): Promise<{ offset: number; header: Uint8Array; crc: number }> {
  const nameBytes = new TextEncoder().encode(name);
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  const { time, date } = dosDate();
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true); // version needed
  view.setUint16(6, 0x0800, true); // UTF-8 flags
  view.setUint16(8, 0, true); // method: store
  view.setUint16(10, time, true);
  view.setUint16(12, date, true);
  const crc = crc32(data);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true); // compressed size
  view.setUint32(22, data.length, true); // uncompressed size
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true); // extra length
  header.set(nameBytes, 30);
  return { offset: 0, header, crc };
}

export async function buildZip(files: ZipFileInput[]): Promise<Blob> {
  if (files.length === 0) throw new Error("Nenhum arquivo para compactar.");

  const records: { name: string; header: Uint8Array; data: Uint8Array; crc: number }[] = [];

  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const { header, crc } = await buildLocalHeader(f.name, data);
    records.push({ name: f.name, header, data, crc });
  }

  // Monta os arquivos locais e registra offsets
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  const { time, date } = dosDate();

  records.forEach((rec) => {
    localChunks.push(rec.header, rec.data);

    const nameBytes = new TextEncoder().encode(rec.name);
    const central = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(central.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // version made by
    view.setUint16(6, 20, true); // version needed
    view.setUint16(8, 0x0800, true); // UTF-8
    view.setUint16(10, 0, true); // method store
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, rec.crc, true);
    view.setUint32(20, rec.data.length, true);
    view.setUint32(24, rec.data.length, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true); // extra
    view.setUint16(32, 0, true); // comment
    view.setUint16(34, 0, true); // disk start
    view.setUint16(36, 0, true); // internal attrs
    view.setUint32(38, 0, true); // external attrs
    view.setUint32(42, offset, true); // local header offset
    central.set(nameBytes, 46);
    centralChunks.push(central);

    offset += rec.header.length + rec.data.length;
  });

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true); // disk number
  endView.setUint16(6, 0, true); // cd start disk
  endView.setUint16(8, records.length, true); // entries this disk
  endView.setUint16(10, records.length, true); // total entries
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true); // cd offset
  endView.setUint16(20, 0, true); // comment length

  const zip = concat([...localChunks, ...centralChunks, end]) as Uint8Array<ArrayBuffer>;
  return new Blob([zip.buffer], { type: "application/zip" });
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}