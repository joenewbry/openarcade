// ProjectileArcSolver.cs

using System.Collections.Generic;
using UnityEngine;

public interface IProjectileArcSolver
{
    Vector3 CalculateArc(Vector3 start, Vector3 target, float initialSpeed);
    bool IsValidLaunch(Vector3 start, Vector3 target, float initialSpeed, float gravity);
    List<Vector3> GeneratePathPoints(Vector3 start, Vector3 target, float initialSpeed, int segments);
}
