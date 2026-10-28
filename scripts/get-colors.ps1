Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap((Join-Path (Get-Location) 'public\logo.png'))
$bg = $bmp.GetPixel(10, 10)
Write-Output ("Background: #{0:X2}{1:X2}{2:X2}" -f $bg.R, $bg.G, $bg.B)

$maxB = 0
$letterPixel = $null
for ($x = 0; $x -lt $bmp.Width; $x += 2) {
    for ($y = 0; $y -lt $bmp.Height; $y += 2) {
        $p = $bmp.GetPixel($x, $y)
        $b = $p.R * 0.299 + $p.G * 0.587 + $p.B * 0.114
        if ($b -gt $maxB) {
            $maxB = $b
            $letterPixel = $p
        }
    }
}
Write-Output ("Lettering: #{0:X2}{1:X2}{2:X2}" -f $letterPixel.R, $letterPixel.G, $letterPixel.B)
