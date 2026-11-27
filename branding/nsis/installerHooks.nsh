; 为道 WeDAO 安装钩子：快捷方式使用品牌图标
!macro NSIS_HOOK_POSTINSTALL
  CreateShortCut "$DESKTOP\为道 WeDAO.lnk" "$INSTDIR\dsh-tauri-app.exe" "" "$INSTDIR\assets\wedao.ico" 0
  CreateDirectory "$SMPROGRAMS\为道 WeDAO"
  CreateShortCut "$SMPROGRAMS\为道 WeDAO\为道 WeDAO.lnk" "$INSTDIR\dsh-tauri-app.exe" "" "$INSTDIR\assets\wedao.ico" 0
!macroend
