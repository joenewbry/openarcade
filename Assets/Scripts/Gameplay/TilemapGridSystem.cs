using System;
using UnityEngine;
using UnityEngine.Tilemaps;

/// <summary>
/// Generates a 30x30 tilemap grid, fills it with random blocks, and snaps the
/// grid bounds to the active orthographic camera view.
/// </summary>
[RequireComponent(typeof(Grid))]
public class TilemapGridSystem : MonoBehaviour
{
    [Header("Grid Size")]
    [SerializeField] private int width = 30;
    [SerializeField] private int height = 30;

    [Header("Block Placement")]
    [Range(0f, 1f)]
    [SerializeField] private float blockChance = 0.22f;
    [SerializeField] private bool randomizeSeedOnAwake = true;
    [SerializeField] private int fixedSeed = 1337;

    [Header("Camera Snap")]
    [SerializeField] private Camera targetCamera;
    [SerializeField] private float cameraPaddingInCells = 1f;

    [Header("Tilemap")]
    [SerializeField] private Tilemap tilemap;
    [SerializeField] private TileBase floorTile;
    [SerializeField] private TileBase blockTile;

    private Grid grid;

    private void Awake()
    {
        grid = GetComponent<Grid>();
        EnsureTilemap();
        EnsureRuntimeTiles();

        GenerateGrid();
        SnapGridToCameraView();
    }

    [ContextMenu("Generate Grid")]
    public void GenerateGrid()
    {
        if (tilemap == null)
        {
            EnsureTilemap();
        }

        tilemap.ClearAllTiles();

        int seed = randomizeSeedOnAwake ? Environment.TickCount : fixedSeed;
        var rng = new System.Random(seed);

        // Force 30x30 requirement while allowing serialized defaults to remain visible/editable.
        width = 30;
        height = 30;

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                bool isBlocked = rng.NextDouble() < blockChance;
                TileBase tileToSet = isBlocked ? blockTile : floorTile;
                tilemap.SetTile(new Vector3Int(x, y, 0), tileToSet);
            }
        }

        tilemap.CompressBounds();
    }

    [ContextMenu("Snap Grid To Camera")]
    public void SnapGridToCameraView()
    {
        Camera cam = targetCamera != null ? targetCamera : Camera.main;
        if (cam == null || !cam.orthographic)
        {
            return;
        }

        float cellWidth = Mathf.Max(0.001f, grid.cellSize.x);
        float cellHeight = Mathf.Max(0.001f, grid.cellSize.y);

        float worldWidth = width * cellWidth;
        float worldHeight = height * cellHeight;

        float paddedWorldWidth = worldWidth + (cameraPaddingInCells * 2f * cellWidth);
        float paddedWorldHeight = worldHeight + (cameraPaddingInCells * 2f * cellHeight);

        float sizeFromHeight = paddedWorldHeight * 0.5f;
        float sizeFromWidth = (paddedWorldWidth / Mathf.Max(0.01f, cam.aspect)) * 0.5f;
        cam.orthographicSize = Mathf.Max(sizeFromHeight, sizeFromWidth);

        // Place bottom-left corner of the grid relative to camera center and snap to the cell size.
        Vector3 camPos = cam.transform.position;
        float startX = camPos.x - (worldWidth * 0.5f);
        float startY = camPos.y - (worldHeight * 0.5f);

        startX = Mathf.Round(startX / cellWidth) * cellWidth;
        startY = Mathf.Round(startY / cellHeight) * cellHeight;

        transform.position = new Vector3(startX, startY, transform.position.z);
    }

    private void EnsureTilemap()
    {
        if (tilemap != null)
        {
            return;
        }

        tilemap = GetComponentInChildren<Tilemap>();
        if (tilemap != null)
        {
            return;
        }

        var tilemapGo = new GameObject("GeneratedTilemap");
        tilemapGo.transform.SetParent(transform, false);

        tilemap = tilemapGo.AddComponent<Tilemap>();
        tilemapGo.AddComponent<TilemapRenderer>();
    }

    private void EnsureRuntimeTiles()
    {
        if (floorTile == null)
        {
            floorTile = CreateSolidColorTile(new Color(0.14f, 0.14f, 0.18f), "FloorTile");
        }

        if (blockTile == null)
        {
            blockTile = CreateSolidColorTile(new Color(0.35f, 0.35f, 0.42f), "BlockTile");
        }
    }

    private Tile CreateSolidColorTile(Color color, string tileName)
    {
        Texture2D texture = new Texture2D(1, 1, TextureFormat.RGBA32, false)
        {
            filterMode = FilterMode.Point,
            wrapMode = TextureWrapMode.Clamp,
            name = tileName + "Texture"
        };

        texture.SetPixel(0, 0, color);
        texture.Apply();

        Sprite sprite = Sprite.Create(
            texture,
            new Rect(0f, 0f, 1f, 1f),
            new Vector2(0.5f, 0.5f),
            1f
        );
        sprite.name = tileName + "Sprite";

        Tile tile = ScriptableObject.CreateInstance<Tile>();
        tile.sprite = sprite;
        tile.name = tileName;

        return tile;
    }
}
