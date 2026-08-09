Add-Type -AssemblyName System.Drawing

$projectRoot = if ($env:CHIRUKO_PROJECT_ROOT) {
  (Resolve-Path $env:CHIRUKO_PROJECT_ROOT).Path
} else {
  (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}
$backgroundPath = Join-Path $projectRoot 'public\assets\social\og-background.png'
$characterPath = Join-Path $projectRoot 'public\assets\characters\chiruko-sit.png'
$outputPath = Join-Path $projectRoot 'public\assets\social\chiruko-og.png'

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$background = [System.Drawing.Image]::FromFile($backgroundPath)
$character = [System.Drawing.Image]::FromFile($characterPath)
$canvas = New-Object System.Drawing.Bitmap 1200, 630, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)

$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$targetRatio = 1200.0 / 630.0
$sourceRatio = $background.Width / [double]$background.Height
if ($sourceRatio -gt $targetRatio) {
  $cropWidth = [int]($background.Height * $targetRatio)
  $cropX = [int](($background.Width - $cropWidth) / 2)
  $sourceRect = New-Object System.Drawing.Rectangle $cropX, 0, $cropWidth, $background.Height
} else {
  $cropHeight = [int]($background.Width / $targetRatio)
  $cropY = [int](($background.Height - $cropHeight) / 2)
  $sourceRect = New-Object System.Drawing.Rectangle 0, $cropY, $background.Width, $cropHeight
}
$graphics.DrawImage($background, (New-Object System.Drawing.Rectangle 0, 0, 1200, 630), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)

$charcoal = [System.Drawing.Color]::FromArgb(255, 43, 39, 47)
$rose = [System.Drawing.Color]::FromArgb(255, 188, 72, 112)
$gold = [System.Drawing.Color]::FromArgb(255, 190, 143, 49)
$ivory = [System.Drawing.Color]::FromArgb(255, 255, 250, 247)

$graphics.DrawImage($character, (New-Object System.Drawing.Rectangle 532, -38, 704, 704))

$sealBrush = New-Object System.Drawing.SolidBrush $charcoal
$goldBrush = New-Object System.Drawing.SolidBrush $gold
$roseBrush = New-Object System.Drawing.SolidBrush $rose
$charcoalBrush = New-Object System.Drawing.SolidBrush $charcoal
$sealPen = New-Object System.Drawing.Pen $gold, 3
$graphics.FillEllipse($sealBrush, 70, 82, 70, 70)
$graphics.DrawEllipse($sealPen, 75, 87, 60, 60)

$fontSeal = New-Object System.Drawing.Font 'Yu Gothic', 28, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$sealTextFormat = New-Object System.Drawing.StringFormat
$sealTextFormat.Alignment = [System.Drawing.StringAlignment]::Center
$sealTextFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('満', $fontSeal, $goldBrush, (New-Object System.Drawing.RectangleF 70, 87, 70, 70), $sealTextFormat)

$fontLabel = New-Object System.Drawing.Font 'Georgia', 16, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fontTitleSmall = New-Object System.Drawing.Font 'Yu Gothic', 62, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fontTitleLarge = New-Object System.Drawing.Font 'Yu Gothic', 94, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$fontTagline = New-Object System.Drawing.Font 'Yu Gothic', 27, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$fontStamp = New-Object System.Drawing.Font 'Yu Gothic', 17, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString('ZANNEN-IN CHIRUKO  /  IDLE CLICKER', $fontLabel, $goldBrush, 160, 96)
$graphics.DrawString('ちる子', $fontTitleSmall, $charcoalBrush, 68, 171)
$titleShadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(32, 43, 39, 47))
$graphics.DrawString('満足計画', $fontTitleLarge, $titleShadowBrush, 72, 246)
$graphics.DrawString('満足計画', $fontTitleLarge, $roseBrush, 68, 242)

$rulePen = New-Object System.Drawing.Pen $gold, 2
$graphics.DrawLine($rulePen, 72, 362, 522, 362)
$graphics.DrawString('ひとさわりから、世界を満たそう。', $fontTagline, $charcoalBrush, 72, 382)

$stampPen = New-Object System.Drawing.Pen $rose, 2
$graphics.DrawRectangle($stampPen, 72, 447, 150, 43)
$graphics.DrawString('満足教公認', $fontStamp, $roseBrush, 96, 457)

$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$fontSeal.Dispose()
$fontLabel.Dispose()
$fontTitleSmall.Dispose()
$fontTitleLarge.Dispose()
$fontTagline.Dispose()
$fontStamp.Dispose()
$sealTextFormat.Dispose()
$sealBrush.Dispose()
$goldBrush.Dispose()
$roseBrush.Dispose()
$charcoalBrush.Dispose()
$titleShadowBrush.Dispose()
$sealPen.Dispose()
$rulePen.Dispose()
$stampPen.Dispose()
$graphics.Dispose()
$canvas.Dispose()
$character.Dispose()
$background.Dispose()

Write-Output "Wrote $outputPath"
