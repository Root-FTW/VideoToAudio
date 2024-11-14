// script.js

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
const uploader = document.getElementById('uploader');
const convertButton = document.getElementById('convertButton');
const progressBar = document.getElementById('progressBar');
const downloadLink = document.getElementById('downloadLink');
const transcriptionResult = document.getElementById('transcriptionResult'); // Elemento para mostrar la transcripción

let userFile;

// Manejar la carga del archivo
uploader.addEventListener('change', (e) => {
  userFile = e.target.files[0];
  if (userFile) {
    convertButton.disabled = false;
    downloadLink.style.display = 'none';
    transcriptionResult.textContent = ''; // Limpiar transcripción anterior
  } else {
    convertButton.disabled = true;
  }
});

// Manejar la conversión al hacer clic
convertButton.addEventListener('click', async () => {
  if (!userFile) return;

  convertButton.disabled = true;
  progressBar.style.display = 'block';
  progressBar.value = 0;
  transcriptionResult.textContent = 'Procesando transcripción...';

  // Cargar FFmpeg si aún no está cargado
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  // Leer el archivo de video
  ffmpeg.FS('writeFile', userFile.name, await fetchFile(userFile));

  // Configurar la salida
  const outputFileName = 'output.mp3';

  // Ejecutar el comando de FFmpeg para extraer el audio
  ffmpeg.setProgress(({ ratio }) => {
    progressBar.value = ratio * 100;
  });

  try {
    await ffmpeg.run('-i', userFile.name, '-q:a', '0', '-map', 'a', outputFileName);
    
    // Leer el archivo de salida
    const data = ffmpeg.FS('readFile', outputFileName);

    // Crear un Blob y un ObjectURL para la descarga
    const audioBlob = new Blob([data.buffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(audioBlob);
    downloadLink.href = url;
    downloadLink.style.display = 'inline';
    downloadLink.textContent = 'Descargar MP3';

    // Ambiente para enviar el audio al backend para transcripción
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.mp3');

    // Enviar la solicitud de transcripción
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en la transcripción');
    }

    const result = await response.json();
    const transcription = result.transcription.text; // Ajusta según la respuesta de Groq

    // Mostrar la transcripción al usuario
    transcriptionResult.textContent = transcription;
  } catch (error) {
    console.error('Error:', error);
    alert(`Ocurrió un error: ${error.message}`);
    transcriptionResult.textContent = 'Error en la transcripción.';
  } finally {
    progressBar.style.display = 'none';
    convertButton.disabled = false;

    // Limpiar el sistema de archivos de FFmpeg
    ffmpeg.FS('unlink', userFile.name);
    ffmpeg.FS('unlink', outputFileName);
  }
});
