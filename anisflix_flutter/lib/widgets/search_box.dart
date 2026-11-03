import 'package:flutter/material.dart';

import 'cached_media_image.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/catalog_api.dart';

/// Desktop autocomplete. RawAutocomplete handles selection, arrows and escape;
/// generation checks keep late responses from replacing a newer query.
class SearchBox extends StatefulWidget {
  final CatalogApi api;
  final ValueChanged<MediaItem> onSelected;
  final ValueChanged<String> onSubmitted;
  const SearchBox({
    super.key,
    required this.api,
    required this.onSelected,
    required this.onSubmitted,
  });
  @override
  State<SearchBox> createState() => _SearchBoxState();
}

class _SearchBoxState extends State<SearchBox> {
  final controller = TextEditingController();
  final focus = FocusNode();
  int generation = 0;
  bool loading = false;
  String? error;
  List<MediaItem> options = [];
  @override
  void dispose() {
    generation++;
    controller.dispose();
    focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => RawAutocomplete<MediaItem>(
      textEditingController: controller,
      focusNode: focus,
      displayStringForOption: (item) => item.title,
      optionsBuilder: (value) async {
        final ticket = ++generation;
        final query = value.text.trim();
        options = [];
        if (query.length < 2) {
          if (mounted) {
            setState(() {
              loading = false;
              error = null;
            });
          }
          return const [];
        }
        setState(() {
          loading = true;
          error = null;
        });
        await Future<void>.delayed(const Duration(milliseconds: 300));
        if (!mounted || ticket != generation) return const [];
        try {
          final page = await widget.api.list('movie', query: query);
          if (!mounted || ticket != generation) return const [];
          options = page.items.take(8).toList();
          return options;
        } catch (_) {
          if (mounted && ticket == generation) {
            setState(() => error = 'Recherche indisponible. Réessaie.');
          }
          return const [];
        } finally {
          if (mounted && ticket == generation) setState(() => loading = false);
        }
      },
      onSelected: (item) {
        focus.unfocus();
        widget.onSelected(item);
      },
      fieldViewBuilder: (context, controller, focusNode, submit) => TextField(
        controller: controller,
        focusNode: focusNode,
        autocorrect: false,
        enableSuggestions: false,
        textInputAction: TextInputAction.search,
        onSubmitted: (value) {
          if (options.isNotEmpty) {
            submit();
          } else if (value.trim().isNotEmpty) {
            focus.unfocus();
            widget.onSubmitted(value.trim());
          }
        },
        decoration: InputDecoration(
          hintText: context.tr("Rechercher un film, une série ou un anime…"),
          prefixIcon: const Icon(Icons.search),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          suffixIcon: loading
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : error != null
              ? Tooltip(
                  message: context.l10n.message(error!),
                  child: const Icon(Icons.cloud_off),
                )
              : IconButton(
                  tooltip: context.tr("Effacer la recherche"),
                  onPressed: () {
                    controller.clear();
                    focus.requestFocus();
                  },
                  icon: const Icon(Icons.close),
                ),
        ),
      ),
      optionsViewBuilder: (context, select, values) =>
          loading || options.isEmpty
          ? const SizedBox.shrink()
          : Align(
              alignment: Alignment.topLeft,
              child: Material(
                elevation: 10,
                clipBehavior: Clip.antiAlias,
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: constraints.maxWidth,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 420),
                    child: ListView.builder(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: values.length,
                      itemBuilder: (context, i) {
                        final item = values.elementAt(i);
                        final highlighted =
                            AutocompleteHighlightedOption.of(context) == i;
                        return ListTile(
                          selected: highlighted,
                          onTap: () => select(item),
                          leading: SizedBox(
                            width: 34,
                            height: 50,
                            child: item.posterUrl == null
                                ? const Icon(Icons.movie_outlined)
                                : CachedMediaImage(
                                    item.posterUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) =>
                                        const Icon(Icons.movie_outlined),
                                  ),
                          ),
                          title: Text(
                            context.l10n.mediaTitle(item.title),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            '${item.type == 'tv' ? context.tr("Série") : context.tr("Film")} · ${item.date.split('-').first}',
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
    ),
  );
}
