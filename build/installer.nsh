!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var PrivacyDialog
Var PrivacyCheckbox

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to the MediaHarbor Setup Wizard"
  !define MUI_WELCOMEPAGE_TEXT "This installer will guide you through installing MediaHarbor.$\r$\n$\r$\nUse this software only for lawful personal use with public content you own or have permission to save.$\r$\n$\r$\nClick Next to review and accept the license agreement."
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\LICENSE.txt"
  Page Custom ShowPrivacyPage LeavePrivacyPage
!macroend

Function ShowPrivacyPage
  nsDialogs::Create 1018
  Pop $PrivacyDialog

  ${If} $PrivacyDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 18u "Privacy and data collection notice"
  Pop $0

  ${NSD_CreateLabel} 0 22u 100% 74u "MediaHarbor is designed to avoid hidden tracking and unnecessary data collection.$\r$\n$\r$\nThe app stores settings and download history locally on this device. It is not designed to use accounts, ads, analytics, or telemetry.$\r$\n$\r$\nIf forced tunnel mode is enabled, your configured backend may process download requests, and practical privacy depends on how that backend is hosted, monitored, and logged."
  Pop $0

  ${NSD_CreateLabel} 0 104u 100% 12u "The full document is included with this installer build as 'Privacy and Data Collection.txt'."
  Pop $0

  ${NSD_CreateCheckbox} 0 126u 100% 12u "I understand the privacy and data collection notice and want to continue."
  Pop $PrivacyCheckbox

  nsDialogs::Show
FunctionEnd

Function LeavePrivacyPage
  ${NSD_GetState} $PrivacyCheckbox $0
  ${If} $0 <> ${BST_CHECKED}
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please confirm that you understand the privacy and data collection notice before continuing."
    Abort
  ${EndIf}
FunctionEnd
