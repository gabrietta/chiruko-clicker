ここへ音声ファイル（mp3 / ogg / wav など）を置きます。

例:
  click.mp3
  purchase.mp3
  achievement.mp3
  lucky.mp3
  voice.mp3
  bgm.mp3

置いた後、src/audio/audioManager.ts の AUDIO_PATHS に
'/assets/audio/click.mp3' のようなパスを設定してください。
null のままでも、ブラウザ生成の仮サウンドで遊べます。

台詞ごとのMP3は、このフォルダ内に voice サブフォルダを作って置きます。

例:
  voice/dialogue-base-01.mp3
  voice/event-purchase.mp3

配置後、src/audio/voiceClips.ts の VOICE_CLIP_PATHS に
  '台詞そのもの': '/assets/audio/voice/dialogue-base-01.mp3'
のように登録すると、その台詞だけ専用音声になります。
登録していない台詞は、共通 voice.mp3 またはブラウザ音声合成へ戻ります。
