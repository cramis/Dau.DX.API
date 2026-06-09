# Gitea 미러링 가이드

GitHub이 메인 저장소. Gitea(내부)에는 필요할 때만 푸시.

- GitHub: `origin` — https://github.com/cramis/Dau.DX.API.git
- Gitea: `gitea` — https://giteav2.donga.ac.kr/cramis/Dau.DX.Api.git

## 일상 사용

```bash
# 평소 (GitHub만)
git push

# Gitea에 올릴 때 (현재 main만)
git push gitea main

# Gitea 전체 동기화 (가끔)
git push gitea --all
git push gitea --tags
```

## 토큰 저장 (처음 1번)

`credential.helper = manager` 활성 상태. Windows Credential Manager에 한 번만 저장하면 이후 자동 인증.

1. Gitea → Settings → Applications → Generate New Token (권한 `repo` 체크)
2. 대화형으로 1회 푸시:

   ```bash
   git push gitea main
   ```

   - Username: `cramis`
   - Password: `<토큰값>`  ← 계정 비밀번호 아님, 토큰 붙여넣기

3. 성공하면 Credential Manager가 암호화 저장. 다음부터 자동.

저장 확인:

```bash
cmdkey /list:git:https://giteav2.donga.ac.kr
```

## 보안 주의

- 토큰을 `.git/config`, 코드, 채팅 등 평문에 두지 말 것. Credential Manager만 사용.
- 토큰 노출 시 Gitea → Settings → Applications에서 즉시 폐기 후 재발급.
- 재발급해도 `gitea` remote 설정은 그대로 유효 (URL에 토큰 미포함).

## 초기 셋업 기록 (참고)

```bash
git remote add gitea https://giteav2.donga.ac.kr/cramis/Dau.DX.Api.git
git push gitea --all --force   # 저장소 생성 시 자동 커밋 덮어씀 (최초 1회)
git push gitea --tags
```
