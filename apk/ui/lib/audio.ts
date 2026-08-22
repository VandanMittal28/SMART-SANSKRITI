function downsampleTo16Khz(samples: Float32Array, sourceRate: number) {
  const targetRate = 16_000
  if (sourceRate === targetRate) return samples

  const ratio = sourceRate / targetRate
  const outputLength = Math.floor(samples.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio)
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end && j < samples.length; j += 1) {
      sum += samples[j]
    }
    output[i] = sum / Math.max(1, end - start)
  }

  return output
}

function encodePcmWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  return new Uint8Array(buffer)
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

export async function recordingToWavBase64(blob: Blob) {
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer())
    const mono = new Float32Array(audioBuffer.length)

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const channelData = audioBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i += 1) {
        mono[i] += channelData[i] / audioBuffer.numberOfChannels
      }
    }

    const samples = downsampleTo16Khz(mono, audioBuffer.sampleRate)
    return bytesToBase64(encodePcmWav(samples, 16_000))
  } finally {
    await audioContext.close()
  }
}
