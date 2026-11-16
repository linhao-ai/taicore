param(
  [Parameter(Mandatory = $true)][string]$Text,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Rate = 0,
  [string]$Voice = 'Microsoft Huihui Desktop'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voiceObj = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq $Voice }
if ($voiceObj) { $synth.SelectVoice($Voice) } else {
  $zh = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'zh-*' } | Select-Object -First 1
  if ($zh) { $synth.SelectVoice($zh.VoiceInfo.Name) }
}
$synth.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
$synth.Volume = 100
$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$synth.SetOutputToWaveFile($Out)
$synth.Speak($Text)
$synth.Dispose()
Write-Output $Out
