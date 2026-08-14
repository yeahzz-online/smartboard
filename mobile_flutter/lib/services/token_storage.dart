import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  final _storage = FlutterSecureStorage();
  static const _accessKey = 'cmr_access_token';
  static const _refreshKey = 'cmr_refresh_token';
  static const _userKey = 'cmr_user';

  Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<String?> getAccessToken() async => await _storage.read(key: _accessKey);
  Future<String?> getRefreshToken() async => await _storage.read(key: _refreshKey);

  Future<void> saveUserJson(String userJson) async {
    await _storage.write(key: _userKey, value: userJson);
  }

  Future<String?> getUserJson() async => await _storage.read(key: _userKey);

  Future<void> clear() async {
    await _storage.deleteAll();
  }
}
