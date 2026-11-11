export function safeName(name:string){return name.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'ecu-file.bin'}
export function validFile(f:FormDataEntryValue|null):f is File{return f instanceof File&&f.size>0&&f.size<=20*1024*1024&&/\.(bin|ori|hex|dat|zip)$/i.test(f.name)}
