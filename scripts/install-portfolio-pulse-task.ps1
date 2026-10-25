param([switch]$Preview, [switch]$Remove)

$ErrorActionPreference = 'Stop'
$pulseTaskName = 'Portfolio monthly pulse'
if ($Remove) {
    if ($Preview) { throw 'Choose -Preview or -Remove, not both.' }
    Unregister-ScheduledTask -TaskName $pulseTaskName -Confirm:$false
    Write-Output "Removed $pulseTaskName."
    exit
}

$pulseRoot = Split-Path -Parent $PSScriptRoot
$pulseNode = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source
if (-not $Preview -and -not (Test-Path -LiteralPath (Join-Path $pulseRoot '.env.pulse')) -and -not $env:GOATCOUNTER_API_TOKEN) {
    throw 'Create .env.pulse in the repository root with GOATCOUNTER_API_TOKEN before installing the monthly task.'
}
$pulseSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$pulseBoundary = [DateTime]::UtcNow.Date.AddDays(1).AddHours(9).AddMinutes(17).ToString("yyyy-MM-ddTHH:mm:ss'Z'")
$pulseRunner = Join-Path $PSScriptRoot 'run-portfolio-pulse.ps1'
$pulseShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$pulseArguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -NodePath "{1}"' -f $pulseRunner, $pulseNode
function Escape-PulseXml([string]$Value) { [System.Security.SecurityElement]::Escape($Value) }

$pulseXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Generate a local monthly portfolio report. No analytics are uploaded.</Description></RegistrationInfo>
  <Triggers><CalendarTrigger><StartBoundary>$pulseBoundary</StartBoundary><Enabled>true</Enabled>
    <ScheduleByMonth><DaysOfMonth><Day>2</Day></DaysOfMonth><Months><January/><February/><March/><April/><May/><June/><July/><August/><September/><October/><November/><December/></Months></ScheduleByMonth>
  </CalendarTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>$pulseSid</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><Enabled>true</Enabled><ExecutionTimeLimit>PT20M</ExecutionTimeLimit></Settings>
  <Actions Context="Author"><Exec><Command>$(Escape-PulseXml $pulseShell)</Command><Arguments>$(Escape-PulseXml $pulseArguments)</Arguments><WorkingDirectory>$(Escape-PulseXml $pulseRoot)</WorkingDirectory></Exec></Actions>
</Task>
"@

if ($Preview) { Write-Output $pulseXml; exit }
Register-ScheduledTask -TaskName $pulseTaskName -Xml $pulseXml -Force | Out-Null
Write-Output 'Installed monthly pulse for the second day of each month at 09:17 UTC, while you are logged in.'
Write-Output "Reports and run.log stay under $pulseRoot\private\portfolio-pulse."
Write-Output 'Remove it with: powershell -NoProfile -File scripts/install-portfolio-pulse-task.ps1 -Remove'
