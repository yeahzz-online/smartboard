import 'dart:convert';
import 'package:http/http.dart' as http;
import 'token_storage.dart';
import 'auth_service.dart';

class ApiService {
  static const String baseUrl = AuthService.baseUrl;
  final TokenStorage _storage = TokenStorage();
  final AuthService _auth = AuthService();

  Future<http.Response> get(String path) async {
    final access = await _storage.getAccessToken();
    final url = Uri.parse('$baseUrl$path');
    final resp = await http.get(url, headers: _authHeaders(access));
    if (resp.statusCode == 401) {
      final refreshed = await _auth.refreshAccessToken();
      if (refreshed) {
        final newAccess = await _storage.getAccessToken();
        return await http.get(url, headers: _authHeaders(newAccess));
      }
    }
    return resp;
  }

  Future<http.Response> post(String path, Map body) async {
    final access = await _storage.getAccessToken();
    final url = Uri.parse('$baseUrl$path');
    final resp = await http.post(url,
        headers: {..._authHeaders(access), 'Content-Type': 'application/json'},
        body: jsonEncode(body));
    if (resp.statusCode == 401) {
      final refreshed = await _auth.refreshAccessToken();
      if (refreshed) {
        final newAccess = await _storage.getAccessToken();
        return await http.post(url,
            headers: {..._authHeaders(newAccess), 'Content-Type': 'application/json'},
            body: jsonEncode(body));
      }
    }
    return resp;
  }

  Map<String, String> _authHeaders(String? access) {
    final headers = <String, String>{};
    if (access != null) headers['Authorization'] = 'Bearer $access';
    return headers;
  }
}
