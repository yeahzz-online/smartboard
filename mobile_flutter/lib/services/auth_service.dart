import 'dart:convert';
import 'package:http/http.dart' as http;
import 'token_storage.dart';

class AuthService {
  // Default backend base URL. On Android emulator use 10.0.2.2: change if needed.
  static const String baseUrl = 'http://10.0.2.2:5000';
  final TokenStorage _storage = TokenStorage();

  Future<bool> login(String identifier, String password) async {
    final url = Uri.parse('$baseUrl/api/auth/login');
    final resp = await http.post(url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier,
          'password': password,
        }));
    if (resp.statusCode == 200) {
      final body = jsonDecode(resp.body);
      final access = body['accessToken'] as String?;
      final refresh = body['refreshToken'] as String?;
      final user = body['user'];
      if (access != null && refresh != null) {
        await _storage.saveTokens(access, refresh);
        if (user != null) {
          try {
            await _storage.saveUserJson(jsonEncode(user));
          } catch (_) {}
        }
        return true;
      }
    }
    return false;
  }

  Future<bool> refreshAccessToken() async {
    final refresh = await _storage.getRefreshToken();
    if (refresh == null) return false;
    final url = Uri.parse('$baseUrl/api/auth/refresh');
    final resp = await http.post(url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}));
    if (resp.statusCode == 200) {
      final body = jsonDecode(resp.body);
      final access = body['accessToken'] as String?;
      if (access != null) {
        await _storage.saveTokens(access, refresh);
        return true;
      }
    }
    return false;
  }

  Future<void> logout() async {
    final refresh = await _storage.getRefreshToken();
    if (refresh != null) {
      try {
        final url = Uri.parse('$baseUrl/api/auth/logout');
        await http.post(url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': refresh}));
      } catch (_) {}
    }
    await _storage.clear();
  }
}
