// api/transcribe.js

const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

export const config = {
  api: {
    bodyParser: false, // Deshabilitar bodyParser para manejar multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Error procesando la solicitud' });
    }

    const audioFile = files.audio;

    if (!audioFile) {
      return res.status(400).json({ error: 'No se encontró el archivo de audio' });
    }

    // Verificar el tamaño del archivo (máximo 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo de audio excede el tamaño máximo permitido de 25 MB' });
    }

    // Leer el archivo de audio
    const audioStream = fs.createReadStream(audioFile.path);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          // 'Content-Type' será manejado por FormData
        },
        body: (() => {
          const FormData = require('form-data');
          const formData = new FormData();
          formData.append('file', audioStream, {
            filename: path.basename(audioFile.path),
            contentType: audioFile.type,
          });
          formData.append('model', 'whisper-large-v3');
          formData.append('response_format', 'verbose_json');
          return formData;
        })(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error de Groq API:', errorText);
        return res.status(500).json({ error: 'Error en la transcripción' });
      }

      const transcription = await response.json();

      // Devuelve la transcripción al cliente
      return res.status(200).json({ transcription });
    } catch (error) {
      console.error('Error en la transcripción:', error);
      return res.status(500).json({ error: 'Error interno en la transcripción' });
    } finally {
      // Limpiar el archivo temporal
      fs.unlink(audioFile.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error al eliminar el archivo temporal:', unlinkErr);
        }
      });
    }
  });
}