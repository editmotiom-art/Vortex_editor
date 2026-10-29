import { pipeline } from '@huggingface/transformers';
import { readFileSync } from 'node:fs';
const asr = await pipeline('automatic-speech-recognition','onnx-community/whisper-base',{dtype:'q8'});
for (const t of [0,8,54,77,123]) {
  const buf = readFileSync(`/tmp/seg${t}.wav`);
  const pcm = new Float32Array((buf.length-44)/2);
  for (let i=0;i<pcm.length;i++) pcm[i]=buf.readInt16LE(44+i*2)/32768;
  const out = await asr(pcm,{language:'portuguese',task:'transcribe',chunk_length_s:30,return_timestamps:true});
  console.log(`[${t}s]`, out.text.trim());
}
