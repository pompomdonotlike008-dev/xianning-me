---
name: hongmeng
description: Convert Web Apps to HarmonyOS Native (ArkTS/ArkUI) and publish to Huawei AppGallery. Use when the user asks to publish an app to Huawei AppGallery, convert a web app to HarmonyOS, build HarmonyOS HAP/APP files, or submit apps to the Huawei AppGallery Connect platform. This skill covers the full pipeline: ArkTS project scaffolding, building with hvigor, code signing, uploading to AppGallery Connect, and submission for review.
---

# Hongmeng: Web App → HarmonyOS Native + AppGallery Publishing

This skill captures the complete workflow for converting a web app (HTML/CSS/JS) into a native HarmonyOS app using ArkTS/ArkUI, and submitting it to Huawei AppGallery for review.

## Critical Rules

> **These rules exist because they were learned the hard way during real development. Breaking them will produce broken apps or rejected submissions.**

### Rule 1: The build system requires a properly configured SDK 24 directory

DevEco Studio SDK components are at `sdk/default/openharmony/` but hvigor expects them at `sdk/default/24/`. The `sdk-pkg.json` file has `"path": "HarmonyOS-6.1.1"` which causes hvigor to look in `sdk/default/HarmonyOS-6.1.1/`. 

**Fix**: Create `sdk/default/24/` with the required components:
```
sdk/default/24/
  ArkTS/     (copy from openharmony/ets/)
  ets/       (copy from openharmony/ets/)
  js/        (copy from openharmony/js/)
  native/    (copy from openharmony/native/) 
  previewer/ (copy from openharmony/previewer/)
  toolchains/ (copy from openharmony/toolchains/)
```
Also add `phone.json` to `24/ArkTS/api/device-define/` and `24/ets/api/device-define/`.

### Rule 2: AGC requires signed .app files with valid certificates

You CANNOT use self-signed certificates. You must:
1. Create a **Release Certificate** in AGC (Users & Permissions → Certificate, APP ID and Profile → Certificate tab → Create → Release Certificate)
2. Create a **Release Profile** linked to the certificate and app
3. Download both .cer and .p7b files

Then use hap-sign-tool to sign:
```bash
# Step 1: Sign the HAP
java -jar hap-sign-tool.jar sign-app \
    -mode localSign \
    -keyAlias <your-key-alias> -keyPwd <password> \
    -appCertFile <cert.cer> \
    -profileFile <profile.p7b> \
    -compatibleVersion 22 \
    -inFile unsigned.hap \
    -signAlg SHA256withECDSA \
    -keystoreFile <keystore.jks> -keystorePwd <password> \
    -outFile signed.hap

# Step 2: Pack into .app  
# Replace entry-default.hap inside the CLI-built .app with signed.hap

# Step 3: Sign the .app
java -jar hap-sign-tool.jar sign-app \
    -mode localSign \
    -keyAlias <your-key-alias> -keyPwd <password> \
    -appCertFile <cert.cer> \
    -profileFile <profile.p7b> \
    -inFile final.app -inForm zip \
    -signAlg SHA256withECDSA \
    -keystoreFile <keystore.jks> -keystorePwd <password> \
    -outFile final.signed.app
```

### Rule 3: API Level 22 or lower for AGC self-check

AGC's automated self-check currently only supports API Level ≤ 22. In `AppScope/app.json5`:
```json
{
  "app": {
    "minAPIVersion": 22,
    "targetAPIVersion": 22
  }
}
```
And in `build-profile.json5`:
```json
{
  "products": [{
    "compileSdkVersion": 22,
    "compatibleSdkVersion": 22,
    "targetSdkVersion": 22
  }]
}
```

### Rule 4: Project path must NOT contain Chinese characters

hvigor fails with: `Invalid project path. Current path does not match.`
Use paths like `D:\soso-harmonyos` or `D:\projects\xxx`, avoid `F:\试验\项目9-制作APP\`.

### Rule 5: Device type must be "phone" not "default"

In `entry/src/main/module.json5`:
```json
{
  "deviceTypes": ["phone"]
}
```

### Rule 6: .abc files must be STORED (not compressed)

AGC checks that `.abc` files in the HAP are uncompressed. When re-packing the HAP:
```python
import zipfile
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in files:
        if file.endswith('.abc'):
            z.writestr(name, data, compress_type=zipfile.ZIP_STORED)
        else:
            z.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
```

### Rule 7: Profile ACL permissions must match App permissions

The profile created in AGC has empty ACLs. Remove all `requestPermissions` from `module.json5` or create a new profile with matching permissions.

### Rule 8: Screenshots must be 1080×1920 (9:16)

AGC requires screenshots at exactly 1080×1920px (9:16 ratio). Source screenshots (940×1688) need to be cropped and resized.

## Project Structure

```
soso-harmonyos/
├── AppScope/
│   ├── app.json5                 # API version, bundleName, version
│   └── media/app_icon.png
├── entry/
│   └── src/main/
│       ├── ets/
│       │   ├── entryability/EntryAbility.ets
│       │   ├── pages/            # 9 page components
│       │   │   ├── Index.ets     # Root with tab bar
│       │   │   ├── WelcomePage.ets
│       │   │   ├── HomePage.ets
│       │   │   ├── DietPage.ets
│       │   │   ├── ExercisePage.ets
│       │   │   ├── SleepPage.ets
│       │   │   ├── ProfilePage.ets
│       │   │   ├── StatsPage.ets
│       │   │   └── KnowledgePage.ets
│       │   ├── components/       # 8 reusable components
│       │   ├── model/            # DataModels, Constants, Preferences
│       │   ├── viewmodel/        # AppViewModel
│       │   └── utils/            # Theme, DateTime, Notification, etc.
│       └── resources/
├── build-profile.json5            # Build and signing config
├── hvigor/hvigor-config.json5     # Hvigor config
├── tools/                         # Automation pipeline scripts
│   ├── agc-publisher.py           # AGC API auto-submission
│   ├── agc-config.json            # AGC credentials config
│   └── pipeline.sh                # Master build pipeline
├── signing/                       # Certificate files
└── publish/                       # Output artifacts
```

## ArkTS to Web API Mapping

| Web Feature | ArkTS Equivalent |
|-------------|-----------------|
| localStorage | `@ohos.data.preferences` |
| Notification API | `@ohos.notification` + `reminderAgent` |
| SVG Progress Ring | Canvas API `arc()` |
| CSS Variables | Theme.ets constants |
| CSS LinearGradient | `.linearGradient({direction, colors})` |
| innerHTML | `@State` + `build()` method |

## Build and Upload Pipeline

### Step 1: Create ArkTS project
- Scaffold directory structure
- Write all page components
- Write data models, constants, viewmodel

### Step 2: Configure and build
```bash
cd D:\soso-harmonyos
set JAVA_HOME=D:\DevEco\DevEcoStudio\jbr
set OHOS_BASE_SDK_HOME=D:\DevEco\DevEcoStudio\sdk\default
hvigorw assembleHap -p product=default     # Build HAP
hvigorw assembleApp -p product=default      # Build .app
```

### Step 3: Get AGC certificates
- AGC Console → APP与元服务 → 证书、APP ID和Profile
- Create Release Certificate (generate CSR, upload to AGC)
- Create Profile (link certificate + app)
- Download .cer and .p7b to signing/

### Step 4: Sign and pack
- Sign inner HAP with hap-sign-tool
- Replace HAP inside CLI-built .app with signed HAP
- Sign the .app at package level

### Step 5: Upload to AGC
- Go to 软件包管理 → Upload → select final.app
- Use "测试和正式上架" mode

### Step 6: Fill submission info
- 应用介绍: 500-8000 chars
- 一句话简介: max 17 chars
- Screenshots: 1080×1920, at least 3
- Privacy policy URL
- Version selection
- Submit for review

## Common AGC Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 991 | Package parsing failed | Usually signing/certificate issue |
| 996 | Certificate validation failed | Cert doesn't match profile |
| ACL不一致 | App permissions > profile ACLs | Remove requestPermissions from module.json5 |
| abc压缩 | .abc file is compressed | Re-pack with STORED compression |
| API>22 | API Level too high | Set minAPIVersion to 22 |
| 调试包 | Debug mode detected | Set debug=false, buildMode=release |

## Automation Scripts

### AGC Publisher (tools/agc-publisher.py)
Uses AGC Publishing API to auto-submit:
1. Get OAuth2 token
2. Get upload URL
3. Upload HAP/APP file
4. Submit for review

### Pipeline (tools/pipeline.sh)
Master orchestrator running all steps:
1. Extract web app data → Constants.ets
2. Generate icons
3. Process screenshots
4. Build HAP/APP
5. Prepare publishing materials
6. Verify completeness
