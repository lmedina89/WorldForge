// Self-contained ZIP STORE writer: no CDN needed, iPhone Safari compatible.
// CRC32 is computed over raw PNG and JSON bytes; ZIP entries are uncompressed.
const encoder=new TextEncoder();
const CRC_TABLE=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;CRC_TABLE[n]=c>>>0;}
function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function write16(dv,offset,n){dv.setUint16(offset,n,true);}
function write32(dv,offset,n){dv.setUint32(offset,n>>>0,true);}
export function createZip(entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>65535)throw new Error('Invalid ZIP entries.');
  const local=[],central=[];let byteOffset=0,centralSize=0;
  for(const {name,data} of entries){
    if(!name||name.includes('..')||name.startsWith('/')||name.includes('\\'))throw new Error('Invalid ZIP filename.');
    const nameBytes=encoder.encode(name);
    const bytes=data instanceof Uint8Array?data:encoder.encode(typeof data==='string'?data:JSON.stringify(data,null,2));
    if(bytes.length>0xffffffff||nameBytes.length>65535)throw new Error('ZIP item too large.');
    const crc=crc32(bytes),loc=new Uint8Array(30+nameBytes.length),ld=new DataView(loc.buffer);
    write32(ld,0,0x04034b50);write16(ld,4,20);write16(ld,6,0x0800);write16(ld,8,0);
    write32(ld,14,crc);write32(ld,18,bytes.length);write32(ld,22,bytes.length);write16(ld,26,nameBytes.length);
    loc.set(nameBytes,30);local.push(loc,bytes);
    const cen=new Uint8Array(46+nameBytes.length),cd=new DataView(cen.buffer);
    write32(cd,0,0x02014b50);write16(cd,4,20);write16(cd,6,20);write16(cd,8,0x0800);write16(cd,10,0);
    write32(cd,16,crc);write32(cd,20,bytes.length);write32(cd,24,bytes.length);write16(cd,28,nameBytes.length);
    write32(cd,42,byteOffset);cen.set(nameBytes,46);central.push(cen);
    byteOffset+=loc.length+bytes.length;centralSize+=cen.length;
  }
  const end=new Uint8Array(22),ed=new DataView(end.buffer);
  write32(ed,0,0x06054b50);write16(ed,8,entries.length);write16(ed,10,entries.length);
  write32(ed,12,centralSize);write32(ed,16,byteOffset);
  return new Blob([...local,...central,end],{type:'application/zip'});
}
