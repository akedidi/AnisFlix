import '../l10n/app_localizations.dart';

import 'package:flutter/material.dart';

class TvSearchKeyboard extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;
  const TvSearchKeyboard({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.onSubmitted,
  });
  @override
  State<TvSearchKeyboard> createState() => _TvSearchKeyboardState();
}

class _TvSearchKeyboardState extends State<TvSearchKeyboard> {
  bool uppercase = false, numbers = false;
  void insert(String value) {
    final c = widget.controller;
    final selection = c.selection;
    final start = selection.isValid ? selection.start : c.text.length;
    final end = selection.isValid ? selection.end : c.text.length;
    c.value = TextEditingValue(
      text: c.text.replaceRange(start, end, value),
      selection: TextSelection.collapsed(offset: start + value.length),
    );
    widget.onChanged(c.text);
  }

  void backspace() {
    final c = widget.controller;
    final s = c.selection;
    final start = s.isValid ? s.start : c.text.length;
    final end = s.isValid ? s.end : c.text.length;
    if (start == end && start == 0) return;
    final from = start == end ? start - 1 : start;
    c.value = TextEditingValue(
      text: c.text.replaceRange(from, end, ''),
      selection: TextSelection.collapsed(offset: from),
    );
    widget.onChanged(c.text);
  }

  void move(int offset) {
    final c = widget.controller;
    final from = c.selection.isValid ? c.selection.extentOffset : c.text.length;
    c.selection = TextSelection.collapsed(
      offset: (from + offset).clamp(0, c.text.length),
    );
  }

  Widget button(
    String label,
    VoidCallback action, {
    bool autofocus = false,
    int flex = 1,
  }) => Expanded(
    flex: flex,
    child: Padding(
      padding: const EdgeInsets.all(3),
      child: SizedBox(
        height: 44,
        child: OutlinedButton(
          autofocus: autofocus,
          onPressed: action,
          style: OutlinedButton.styleFrom(
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: Text(
            label,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final french = context.l10n.locale.languageCode == 'fr';
    final spanish = context.l10n.locale.languageCode == 'es';
    final rows = numbers
        ? ['1234567890', '@#€%&*()!?', "+=/:;,\"'-."]
        : french
        ? ['azertyuiop', 'qsdfghjklm', "wxcvbn'-."]
        : ['qwertyuiop', spanish ? 'asdfghjklñ' : 'asdfghjkl', "zxcvbnm'-."];
    return Column(
      children: [
        for (var i = 0; i < rows.length; i++)
          Row(
            children: [
              for (final char in rows[i].split(''))
                button(
                  uppercase ? char.toUpperCase() : char,
                  () => insert(uppercase ? char.toUpperCase() : char),
                  autofocus: i == 0 && char == rows.first[0],
                ),
            ],
          ),
        Row(
          children: [
            button(
              uppercase ? '⇩' : '⇧',
              () => setState(() => uppercase = !uppercase),
            ),
            button(
              numbers ? 'abc' : '123',
              () => setState(() => numbers = !numbers),
            ),
            button('◀', () => move(-1)),
            button(context.tr("Espace"), () => insert(' '), flex: 3),
            button('▶', () => move(1)),
            button('⌫', backspace),
            button('OK', widget.onSubmitted),
          ],
        ),
      ],
    );
  }
}
