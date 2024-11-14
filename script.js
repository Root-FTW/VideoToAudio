const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
const uploader = document.getElementById('uploader');
const convertButton = document.getElementById('convertButton');
const progressBar = document.getElementById('progressBar');
const downloadLink = document.getElementById('downloadLink');

let userFile;

// Manejar la carga del archivo
uploader.addEventListener('change', (e) => {
  userFile = e.target.files[0];
  if (userFile) {
    convertButton.disabled = false;
    downloadLink.style.display = 'none';
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

    // Limpiar el sistema de archivos de FFmpeg
    ffmpeg.FS('unlink', userFile.name);
    ffmpeg.FS('unlink', outputFileName);
  } catch (error) {
    console.error('Error durante la conversión:', error);
    alert('Ocurrió un error durante la conversión. Por favor, intenta de nuevo.');
  } finally {
    progressBar.style.display = 'none';
    convertButton.disabled = false;
  }
});
