import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class AdminHomePage extends StatelessWidget {
  final _auth = AuthService();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Admin Home'), actions: [
        IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              await _auth.logout();
              Navigator.pushReplacementNamed(context, '/login');
            })
      ]),
      body: Center(child: Text('Welcome, Admin')),
    );
  }
}
