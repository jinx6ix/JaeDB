$path = "C:\Users\Jinx\Documents\Jae.co.ke\jaetravel-complete-project\complete-project\JaeDB\prisma\schema.prisma"
$content = Get-Content -Path $path -Raw

$oldModel = @"
model TransportFee {
  id            String   @id @default(cuid()) @map("id")
  vehicleType   String   @map("vehicle_type")
  sittingCapacity Int   @map("sitting_capacity")
  fee           Float    @map("fee")
  currency      String   @default("USD") @map("currency")
  seasonId      String   @map("season_id")
  route         String?  @map("route")
  notes         String?  @map("notes")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("transport_fees")
}
"@

$newModel = @"
model TransportFeeSeason {
  id          String   @id @default(cuid()) @map("id")
  name        String   @map("name")
  startDate   DateTime? @map("start_date")
  endDate     DateTime? @map("end_date")
  notes       String?  @map("notes")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  transportFees TransportFee[]

  @@map("transport_fee_seasons")
}

model TransportFee {
  id            String   @id @default(cuid()) @map("id")
  vehicleType   String   @map("vehicle_type")
  sittingCapacity Int   @map("sitting_capacity")
  fee           Float    @map("fee")
  currency      String   @default("USD") @map("currency")
  seasonId      String   @map("season_id")
  route         String?  @map("route")
  notes         String?  @map("notes")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  season TransportFeeSeason? @relation(fields: [seasonId], references: [id], onDelete: SetNull)

  @@map("transport_fees")
}
"@

if ($content -match [regex]::Escape($oldModel)) {
  $content = $content -replace [regex]::Escape($oldModel), $newModel
  Set-Content -Path $path -Value $content
  Write-Host "Replaced successfully"
} else {
  Write-Host "Pattern not found"
  # Debug: show TransportFee section
  $lines = Get-Content -Path $path
  $lines | Select-Object -Skip 593 -First 20
}