param([string]$Ffmpeg = 'D:\26project\26audio_and_video_project\ffmpeg-n6.1.3-win64-gpl-shared-6.1\bin\ffmpeg.exe')
$ErrorActionPreference = 'Stop'
$fixtureRoot = Join-Path $PSScriptRoot 'fixtures'
New-Item -ItemType Directory -Force -Path $fixtureRoot | Out-Null
& $Ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'testsrc=size=640x360:rate=1' -frames:v 1 -q:v 3 (Join-Path $fixtureRoot 'test-image.jpeg')
if ($LASTEXITCODE -ne 0) { throw '图片生成失败' }
& $Ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=640x360:rate=24' -t 4 -c:v libx264 -pix_fmt yuv420p -movflags +faststart (Join-Path $fixtureRoot 'test-video.mp4')
if ($LASTEXITCODE -ne 0) { throw '视频生成失败' }
Add-Type -AssemblyName System.Speech
$testSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $testSpeaker.SelectVoice('Microsoft Huihui Desktop')
  $testSpeaker.SetOutputToWaveFile((Join-Path $fixtureRoot 'test-voice.wav'))
  $testSpeaker.Speak('这是媒体下载器的中文测试语音。我们核对文件大小和哈希，检查下载结果是否完整。')
} finally { $testSpeaker.Dispose() }
& $Ffmpeg -hide_banner -loglevel error -y -i (Join-Path $fixtureRoot 'test-voice.wav') -c:a libopus -b:a 32k (Join-Path $fixtureRoot 'test-voice.ogg')
if ($LASTEXITCODE -ne 0) { throw '语音转码失败' }
Write-Output '自有测试素材生成完成；没有上传到 Telegram。'
