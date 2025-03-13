# Script to rename PNG images with sequential numbering
# Create output directory if it doesn't exist
$outputDir = "Frames"
if (-not (Test-Path -Path $outputDir)) {
    New-Item -Path $outputDir -ItemType Directory
}

# Get all PNG files from the StaticLight directory
$pngFiles = Get-ChildItem -Path "StaticLight" -Filter "*.png"

# Sort the files by the frame number at the end of the filename
$sortedFiles = $pngFiles | Sort-Object { 
    if ($_.Name -match "Solo_(\d+)\.png$") {
        [int]$matches[1]
    } else {
        0
    }
}

# Initialize frame counter
$frameCounter = 0

# Process each file
foreach ($file in $sortedFiles) {
    # Extract the frame number from the filename
    if ($file.Name -match "Solo_(\d+)\.png$") {
        $frameNumber = $matches[1]
        
        # Format the new frame number with leading zeros
        $paddedFrameNumber = "{0:00000}" -f $frameCounter
        
        # Define the output filename (keeping as PNG for now)
        $outputFile = Join-Path -Path $outputDir -ChildPath "frame_$paddedFrameNumber.png"
        
        # Copy the file with the new name
        Write-Host "Copying $($file.Name) to $outputFile"
        
        try {
            Copy-Item -Path $file.FullName -Destination $outputFile -Force
            Write-Host "Copied $($file.Name) to $outputFile" -ForegroundColor Green
        }
        catch {
            Write-Host "Error copying $($file.Name): $_" -ForegroundColor Red
        }
        
        # Increment the frame counter
        $frameCounter++
    }
    else {
        Write-Host "Skipping $($file.Name) - doesn't match expected pattern" -ForegroundColor Yellow
    }
}

Write-Host "Renaming complete. $frameCounter files processed." -ForegroundColor Green 