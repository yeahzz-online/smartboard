import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import '../services/api.dart';

class UploadPage extends StatefulWidget {
  @override
  _UploadPageState createState() => _UploadPageState();
}

class _UploadPageState extends State<UploadPage> {
  ApiService api = ApiService();
  PlatformFile? _picked;
  bool _uploading = false;

  Future<void> _pickFile() async {
    final res = await FilePicker.platform.pickFiles(allowMultiple: false);
    if (res != null && res.files.isNotEmpty) {
      setState(() => _picked = res.files.first);
    }
  }

  Future<void> _startUpload() async {
    if (_picked == null) return;
    setState(() => _uploading = true);

    // Request presign. Adjust payload to match your backend expectations.
    final resp = await api.post('/api/student/uploads/presign', {
      'fileName': _picked!.name,
      'fileType': _picked!.extension ?? 'bin'
    });

    if (resp.statusCode != 200) {
      setState(() => _uploading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Presign failed: ${resp.statusCode}')));
      return;
    }

    final body = jsonDecode(resp.body);
    final uploadUrl = body['uploadUrl'] as String?;
    final uploadToken = body['uploadToken'] as String?; // if proxy mode

    final bytes = _picked!.bytes ?? await File(_picked!.path!).readAsBytes();

    if (uploadUrl != null) {
      // Direct PUT to presigned URL
      final putResp = await http.put(Uri.parse(uploadUrl), headers: {
        'Content-Type': 'application/octet-stream',
      }, body: bytes);
      if (putResp.statusCode >= 200 && putResp.statusCode < 300) {
        // Tell backend to complete
        final complete = await api.post('/api/student/uploads/complete', {
          'fileName': _picked!.name,
          'fileUrl': uploadUrl,
        });
        if (complete.statusCode == 200 || complete.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload complete')));
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Complete failed: ${complete.statusCode}')));
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload to storage failed: ${putResp.statusCode}')));
      }
    } else if (uploadToken != null) {
      // Proxy upload: PUT to backend /api/storage/upload?token=...
      final url = Uri.parse('${ApiService.baseUrl}/api/storage/upload?token=$uploadToken');
      final putResp = await http.put(url, headers: {'Content-Type': 'application/octet-stream'}, body: bytes);
      if (putResp.statusCode >= 200 && putResp.statusCode < 300) {
        // Ask backend to complete using returned info or known key
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Proxy upload succeeded')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Proxy upload failed: ${putResp.statusCode}')));
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Presign response missing uploadUrl')));
    }

    setState(() => _uploading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Upload Presentation'), actions: [
        IconButton(icon: Icon(Icons.logout), onPressed: () => Navigator.pushReplacementNamed(context, '/login'))
      ]),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ElevatedButton(onPressed: _pickFile, child: Text('Pick File')),
            SizedBox(height: 12),
            Text(_picked?.name ?? 'No file selected'),
            SizedBox(height: 20),
            _uploading ? CircularProgressIndicator() : ElevatedButton(onPressed: _startUpload, child: Text('Upload'))
          ],
        ),
      ),
    );
  }
}
