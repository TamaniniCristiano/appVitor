Coloque AQUI 3 arquivos MP3:

1. mario-theme.mp3   → trilha sonora de fundo (loop, volume 35%)
2. mario-victory.mp3 → toca quando alguém confirma "Vou sim!" (final de fase)
3. mario-death.mp3   → toca quando alguém escolhe "Não vou conseguir" 🤣

URLs sugeridas (você baixa em MP3 com yt-dlp):

  # tema de fundo
  yt-dlp -x --audio-format mp3 --no-playlist \
    -o "mario-theme.%(ext)s" "https://www.youtube.com/watch?v=Q_saM7I20pY"

  # vitória / fase concluída (confirmação de presença)
  yt-dlp -x --audio-format mp3 --no-playlist \
    -o "mario-victory.%(ext)s" "https://www.youtube.com/watch?v=3BsBXp6VkvU"

  # morte do Mario (recusa de presença)
  yt-dlp -x --audio-format mp3 --no-playlist \
    -o "mario-death.%(ext)s" "https://www.youtube.com/shorts/ZHZZku3mlKY"

Recomendado: cada arquivo entre 1-3 MB, MP3 128kbps.
Comprimir com: ffmpeg -i input.mp3 -b:a 128k saida.mp3
