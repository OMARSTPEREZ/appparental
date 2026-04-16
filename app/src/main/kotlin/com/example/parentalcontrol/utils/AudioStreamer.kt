package com.example.parentalcontrol.utils

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AudioStreamer(private val firebaseSyncManager: FirebaseSyncManager) {
    private var audioRecord: AudioRecord? = null
    private var isStreaming = false
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

    @SuppressLint("MissingPermission")
    fun startStreaming() {
        if (isStreaming) return
        isStreaming = true

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        audioRecord?.startRecording()
        
        executor.execute {
            val buffer = ShortArray(bufferSize)
            while (isStreaming) {
                val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    // Convert short array to byte array for base64
                    val bytes = ByteArray(read * 2)
                    for (i in 0 until read) {
                        bytes[i * 2] = (buffer[i].toInt() and 0x00FF).toByte()
                        bytes[i * 2 + 1] = (buffer[i].toInt() shr 8).toByte()
                    }
                    val base64 = Base64.encodeToString(bytes, Base64.DEFAULT)
                    firebaseSyncManager.syncAudioChunk(base64)
                }
                // Throttling to keep database bandwidth reasonable
                Thread.sleep(300) 
            }
        }
    }

    fun stopStreaming() {
        isStreaming = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }
}
