import 'package:flutter/material.dart';

class AnimeIcon extends StatelessWidget {
  const AnimeIcon({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = IconTheme.of(context);
    final color = theme.color ?? Colors.black;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: theme.size ?? 24,
        child: CustomPaint(
          painter: _AnimeIconPainter(
            color.withValues(alpha: color.a * (theme.opacity ?? 1)),
          ),
        ),
      ),
    );
  }
}

class _AnimeIconPainter extends CustomPainter {
  final Color color;
  const _AnimeIconPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 24, size.height / 24);
    final pen = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.7
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(
      Path()
        ..moveTo(4.5, 12.5)
        ..lineTo(2.5, 8)
        ..lineTo(6.5, 8.5)
        ..lineTo(5.5, 3.5)
        ..lineTo(9.5, 5)
        ..lineTo(12, 1.8)
        ..lineTo(14.5, 5)
        ..lineTo(19, 3.5)
        ..lineTo(18, 7.5)
        ..lineTo(21.5, 7)
        ..lineTo(19.5, 12.5)
        ..lineTo(18.7, 17)
        ..quadraticBezierTo(18, 20, 12, 22)
        ..quadraticBezierTo(6, 20, 5.3, 17)
        ..close()
        ..moveTo(4.5, 12.5)
        ..lineTo(8.5, 9.5)
        ..lineTo(9, 12)
        ..lineTo(13, 8.8)
        ..lineTo(15, 11.5)
        ..lineTo(18.5, 9.8)
        ..lineTo(19.5, 12.5)
        ..moveTo(7.5, 14)
        ..lineTo(10, 15)
        ..moveTo(9.5, 14.8)
        ..lineTo(9.5, 15.8)
        ..moveTo(14, 15)
        ..lineTo(16.5, 14)
        ..moveTo(14.5, 14.8)
        ..lineTo(14.5, 15.8)
        ..moveTo(10.7, 18.5)
        ..lineTo(13.3, 18.5),
      pen,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_AnimeIconPainter oldDelegate) =>
      color != oldDelegate.color;
}
