

# Análise: Amazon Appstore SDK — O que falta implementar

## O que já existe no código (`appstore-sdk.ts`)

| Funcionalidade | Implementado? | Notas |
|---|---|---|
| DRM `checkLicense()` | Sim | Mas usa nome errado — SDK real usa `LicensingService.verifyLicense()` |
| DRM `verifyLicenseReceipt()` | Sim | OK |
| IAP `getProductData()` | Sim | OK |
| IAP `purchase()` | Sim | OK |
| IAP `getPurchaseUpdates()` | Sim | Falta paginação (`hasMore`) |
| IAP `notifyFulfillment()` | Sim | Falta enum `FULFILLED`/`UNAVAILABLE` |
| SSI `signIn/signOut/getStatus` | Sim | OK |
| Web fallback para desenvolvimento | Sim | OK |

## O que FALTA (comparando com a documentação oficial)

### 1. `getUserData()` — Método obrigatório ausente
A documentação exige chamar `getUserData()` no `onResume()` para obter `userId`, `marketplace` e `countryCode`. O bridge atual não tem esse método. Sem ele, não é possível:
- Verificar se o usuário mudou de conta
- Obter o marketplace/countryCode para precificação regional
- Desabilitar compras quando `FAILED` ou `NOT_SUPPORTED`

### 2. `enablePendingPurchases()` — Não implementado
Recurso para Amazon Kids (compras pendentes aprovação dos pais). O SDK exige chamá-lo no `onCreate()`. O status `PENDING` já existe no tipo mas não é tratado no hook.

### 3. `registerListener()` — Padrão assíncrono incorreto
O SDK real usa um padrão de broadcast receiver assíncrono: você chama `PurchasingService.purchase()` e recebe a resposta via `PurchasingListener.onPurchaseResponse()`. O bridge atual simula chamadas síncronas (Promise), o que está OK para web, mas o plugin nativo precisa mapear callbacks para Promises corretamente.

### 4. Paginação de `getPurchaseUpdates`
A resposta real é **paginada** (`hasMore()` flag). Se `hasMore` é `true`, o app deve chamar `getPurchaseUpdates()` novamente. O código atual não trata isso.

### 5. `FulfillmentResult` enum
`notifyFulfillment()` aceita `FULFILLED` ou `UNAVAILABLE`. O código atual usa `boolean` — deve usar o enum correto.

### 6. DRM: status `ERROR_VERIFICATION` e `ERROR_INVALID_LICENSING_KEYS`
O tipo `LicenseStatus` atual tem `LICENSED | NOT_LICENSED | EXPIRED | UNKNOWN | ERROR`. Faltam:
- `ERROR_VERIFICATION`
- `ERROR_INVALID_LICENSING_KEYS`

### 7. `getAppstoreSDKMode()` — Sandbox/Production detection
Útil para testar com Amazon App Tester. Não implementado.

### 8. Capacitor Native Plugin (Java/Kotlin)
Não existe o plugin nativo Android (`AmazonAppstoreSDK`) que faz a ponte entre o Capacitor e o SDK Java real. O bridge TypeScript está correto mas sem o plugin Android, nada funciona em produção.

### 9. AndroidManifest.xml entries
Faltam as entradas obrigatórias:
- `ResponseReceiver` para IAP
- `ResponseReceiver` para DRM
- `<queries>` para Amazon App Tester e Appstore

### 10. `AppstoreAuthenticationKey.pem`
A chave pública do app precisa estar em `app/src/main/assets/`. Não há referência nem instrução no projeto.

## Plano de Implementação

### Passo 1: Atualizar `appstore-sdk.ts` (bridge TypeScript)
- Adicionar `getUserData()` com tipos `UserData` (userId, marketplace, countryCode)
- Adicionar `enablePendingPurchases()`
- Adicionar `getAppstoreSDKMode()` (retorna `SANDBOX` | `PRODUCTION` | `UNKNOWN`)
- Expandir `LicenseStatus` com `ERROR_VERIFICATION` e `ERROR_INVALID_LICENSING_KEYS`
- Substituir `boolean` por `FulfillmentResult` enum (`FULFILLED` | `UNAVAILABLE`) em `notifyFulfillment()`
- Adicionar lógica de paginação em `getPurchaseUpdates()` (loop `hasMore`)
- Adicionar web fallback para os novos métodos

### Passo 2: Atualizar `useAppstoreSDK.ts` (hook React)
- Adicionar `userData` ao state (userId, marketplace, countryCode)
- Chamar `getUserData()` na inicialização
- Tratar status `PENDING` no fluxo de compra
- Expor `enablePendingPurchases` e `sdkMode`

### Passo 3: Criar Capacitor Native Plugin (Java)
- Criar `android/src/.../AmazonAppstoreSDKPlugin.java` com `@CapacitorPlugin`
- Implementar cada `@PluginMethod`: `checkLicense`, `getUserData`, `getProductData`, `purchase`, `getPurchaseUpdates`, `notifyFulfillment`, `enablePendingPurchases`, `getAppstoreSDKMode`, `signIn`, `signOut`, `getSignInStatus`
- Registrar `PurchasingListener` e `LicensingListener`
- Mapear callbacks assíncronos para `PluginCall.resolve()`

### Passo 4: Documentar setup Android
- AndroidManifest.xml entries (ResponseReceiver para IAP e DRM, queries)
- build.gradle dependency (`com.amazon.device:amazon-appstore-sdk:3.+`)
- AppstoreAuthenticationKey.pem placement
- ProGuard rules para DRM

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `src/lib/amazon/appstore-sdk.ts` | Adicionar getUserData, enablePendingPurchases, paginação, FulfillmentResult, SDKMode, novos status DRM |
| `src/hooks/useAppstoreSDK.ts` | Adicionar userData, sdkMode, pending purchases |
| `android/app/src/main/java/.../AmazonAppstoreSDKPlugin.java` | Criar — plugin nativo Capacitor |
| `docs/amazon-appstore-setup.md` | Criar — guia de setup completo |

## Nota técnica
O plugin nativo Java não pode ser testado no Lovable (ambiente web). O bridge TS com web fallbacks permite desenvolvimento e testes. O plugin Java será usado quando você fizer `npx cap sync` no seu ambiente local com Android Studio.

