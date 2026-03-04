// MatchConfig.cs

[System.Serializable]
public class MatchConfig {
    public int maxPlayers;
    public float matchDuration;
    public string mapName;
    public bool allowSpectators;
    public string[] allowedTankTypes;
}