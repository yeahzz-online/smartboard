import 'package:flutter/material.dart';
import 'pages/login_page.dart';
import 'pages/upload_page.dart';
import 'pages/student_home.dart';
import 'pages/faculty_home.dart';
import 'pages/admin_home.dart';

void main() {
  runApp(CmrMobileApp());
}

class CmrMobileApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CMR Smart Presentation',
      theme: ThemeData(primarySwatch: Colors.blue),
      initialRoute: '/login',
      routes: {
        '/login': (_) => LoginPage(),
        '/upload': (_) => UploadPage(),
        '/studentHome': (_) => StudentHomePage(),
        '/facultyHome': (_) => FacultyHomePage(),
        '/adminHome': (_) => AdminHomePage(),
      },
    );
  }
}
